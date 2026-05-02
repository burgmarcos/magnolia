use nix::mount::{mount, MsFlags};
use nix::sys::signal::{self, SigHandler, Signal};
use std::fs;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

extern "C" fn handle_sigterm(_: i32) {
    // Note: println! is not strictly async-signal-safe but acceptable for PID 1 shutdown log
    println!("[Magnolia] Received SIGTERM. Commencing graceful powerdown...");
    std::process::exit(0);
}

extern "C" fn handle_sigint(_: i32) {
    println!("[Magnolia] Received SIGINT. Re-initializing graphics...");
}

/// Check whether a target path is already an active mount point of the
/// expected filesystem type. Used to skip filesystems the kernel may have
/// auto-mounted (e.g. devtmpfs when CONFIG_DEVTMPFS_MOUNT=y).
fn is_already_mounted(target: &str, fstype: Option<&str>) -> bool {
    let mounts = match fs::read_to_string("/proc/mounts") {
        Ok(s) => s,
        Err(_) => return false,
    };
    for line in mounts.lines() {
        let fields: Vec<&str> = line.split_whitespace().collect();
        if fields.len() < 3 {
            continue;
        }
        if fields[1] == target {
            return match fstype {
                Some(t) => fields[2] == t,
                None => true,
            };
        }
    }
    false
}

/// Detect if we are running inside a virtual machine (QEMU, KVM, etc.)
/// by inspecting DMI product name and CPU flags.
fn is_running_in_vm() -> bool {
    // Check DMI product name for known hypervisor identifiers
    if let Ok(product) = fs::read_to_string("/sys/class/dmi/id/product_name") {
        if product.contains("QEMU") || product.contains("KVM") || product.contains("Virtual") {
            return true;
        }
    }
    // Fallback: check if CPU advertises hypervisor flag
    if let Ok(cpuinfo) = fs::read_to_string("/proc/cpuinfo") {
        if cpuinfo.contains("hypervisor") {
            return true;
        }
    }
    false
}

fn main() {
    println!("[Magnolia] Initializing Sovereign Supervisor (PID 1)...");

    // 1. Mount essential filesystems using direct Syscalls
    struct MountEntry {
        source: Option<&'static str>,
        target: &'static str,
        fstype: Option<&'static str>,
        flags: MsFlags,
        data: Option<&'static str>,
    }

    let mounts = [
        MountEntry {
            source: Some("proc"),
            target: "/proc",
            fstype: Some("proc"),
            flags: MsFlags::empty(),
            data: None,
        },
        MountEntry {
            source: Some("sysfs"),
            target: "/sys",
            fstype: Some("sysfs"),
            flags: MsFlags::empty(),
            data: None,
        },
        MountEntry {
            source: Some("devtmpfs"),
            target: "/dev",
            fstype: Some("devtmpfs"),
            flags: MsFlags::empty(),
            data: None,
        },
        MountEntry {
            source: Some("tmpfs"),
            target: "/tmp",
            fstype: Some("tmpfs"),
            flags: MsFlags::empty(),
            data: None,
        },
        MountEntry {
            source: Some("tmpfs"),
            target: "/run",
            fstype: Some("tmpfs"),
            flags: MsFlags::empty(),
            data: None,
        },
    ];

    for entry in mounts {
        // Skip if filesystem already mounted (kernel may auto-mount devtmpfs
        // when CONFIG_DEVTMPFS_MOUNT=y, in which case our mount call would
        // return EBUSY).
        if is_already_mounted(entry.target, entry.fstype) {
            println!(
                "[Magnolia] {} already mounted at {} (skipping)",
                entry.fstype.unwrap_or("?"),
                entry.target
            );
            continue;
        }
        println!(
            "[Magnolia] Syscall Mounting {} to {}...",
            entry.fstype.unwrap_or("none"),
            entry.target
        );
        let _ = fs::create_dir_all(entry.target);
        if let Err(e) = mount(
            entry.source,
            entry.target,
            entry.fstype,
            entry.flags,
            entry.data,
        ) {
            eprintln!(
                "[Magnolia ERROR] Syscall failed for {}: {}",
                entry.target, e
            );
        }
    }

    // 1.1 Mount Persistent Partitions
    // We mount by GPT partition LABEL (set in magnolia-distro/board/.../genimage.cfg)
    // so this works regardless of disk bus (virtio, sata, nvme) and partition order.
    // The kernel populates /dev/disk/by-partlabel/* automatically once udev runs;
    // we do an early udev settle before this point would be ideal, but in practice
    // the symlinks exist by the time we reach this code on QEMU.
    let persistent_mounts: [(&str, &str, &str); 2] = [
        ("/dev/disk/by-partlabel/appdata", "/data", "ext4"),
        ("/dev/disk/by-partlabel/userdata", "/home/sovereign", "ext4"),
    ];

    for (dev, target, fstype) in persistent_mounts {
        println!(
            "[Magnolia] Attempting to mount persistent storage {} to {}...",
            dev, target
        );
        let _ = fs::create_dir_all(target);

        // Wait briefly for the by-partlabel symlink to appear (udev race on cold boot).
        for _ in 0..10 {
            if fs::metadata(dev).is_ok() {
                break;
            }
            thread::sleep(Duration::from_millis(200));
        }

        let mut attempts = 0;
        let mut mounted = false;
        while attempts < 3 {
            match mount(
                Some(dev),
                target,
                Some(fstype),
                MsFlags::empty(),
                None::<&str>,
            ) {
                Ok(_) => {
                    println!(
                        "[Magnolia] Successfully mounted persistence layer: {}",
                        target
                    );
                    mounted = true;
                    break;
                }
                Err(e) => {
                    eprintln!("[Magnolia] mount({}) attempt {} failed: {}", dev, attempts + 1, e);
                }
            }
            attempts += 1;
            thread::sleep(Duration::from_millis(500 * attempts));
        }

        // First-boot bootstrap: if mount kept failing, the partition is likely
        // raw-blank (genimage reserves the slot but doesn't preformat). mkfs and
        // retry once. This makes the OS self-heal on a fresh image.
        if !mounted && fs::metadata(dev).is_ok() {
            println!("[Magnolia] {} unmountable; running mkfs.{} (first-boot)...", dev, fstype);
            let mkfs = Command::new(format!("/usr/sbin/mkfs.{}", fstype))
                .args(["-F", "-q", "-L", target.trim_start_matches('/')])
                .arg(dev)
                .status();
            match mkfs {
                Ok(s) if s.success() => {
                    if mount(Some(dev), target, Some(fstype), MsFlags::empty(), None::<&str>).is_ok() {
                        println!("[Magnolia] mkfs+mount succeeded: {}", target);
                    } else {
                        eprintln!("[Magnolia ERROR] mount still failing after mkfs on {}", dev);
                    }
                }
                Ok(s) => eprintln!("[Magnolia ERROR] mkfs.{} on {} exited {}", fstype, dev, s),
                Err(e) => eprintln!("[Magnolia ERROR] could not exec mkfs.{}: {}", fstype, e),
            }
        }
    }

    // 2. Set Hostname
    let hostname = "magnolia";
    println!("[Magnolia] Setting hostname to '{}'...", hostname);
    let _ = fs::write("/proc/sys/kernel/hostname", hostname);

    // 3. Environment Preparation
    unsafe {
        std::env::set_var("PATH", "/usr/sbin:/usr/bin:/sbin:/bin");
    }

    // Create XDG_RUNTIME_DIR for Wayland/Cage
    let xdg_dir = "/run/user/0";
    let _ = fs::create_dir_all(xdg_dir);
    unsafe {
        std::env::set_var("XDG_RUNTIME_DIR", xdg_dir);
        // Force software rendering for stable operation in virtualized/headless environments
        std::env::set_var("WLR_RENDERER", "pixman");
        std::env::set_var("WLR_NO_HARDWARE_CURSORS", "1");
        // Allow Cage to start without physical input devices (required for VM environments)
        std::env::set_var("WLR_LIBINPUT_NO_DEVICES", "1");
        // Force GTK/WebKitGTK to use software rendering (no GL required)
        std::env::set_var("GDK_BACKEND", "wayland");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        // Force mesa software rendering (avoids DRM render node requirement)
        std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "1");
        std::env::set_var("GALLIUM_DRIVER", "softpipe");
        std::env::set_var("GSK_RENDERER", "cairo");
        // Prevent Cage XDG shell race — give wlroots extra init time
        std::env::set_var("CAGE_STARTUP_DELAY", "1");
    }

    // Only disable WebKit sandbox in VM environments — on real hardware the sandbox stays on
    if is_running_in_vm() {
        println!("[Magnolia] VM detected — disabling WebKit sandbox for DRM/env access");
        unsafe {
            std::env::set_var("WEBKIT_FORCE_SANDBOX", "0");
            std::env::set_var("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS", "1");
        }
    }

    // Start udev daemon to populate devices (DRM, input)
    println!("[Magnolia] Starting udev daemon...");
    let _udevd = Command::new("/sbin/udevd").arg("--daemon").spawn();

    println!("[Magnolia] Triggering uevents...");
    let _ = Command::new("/bin/udevadm")
        .args(["trigger", "--type=subsystems", "--action=add"])
        .status();
    let _ = Command::new("/bin/udevadm")
        .args(["trigger", "--type=devices", "--action=add"])
        .status();
    let _ = Command::new("/bin/udevadm").args(["settle"]).status();

    // 4. Launch the Magnolia Hub (Tauri) via Cage Compositor
    println!("[Magnolia] Launching Magnolia Dashboard Hub on Cage...");
    thread::sleep(Duration::from_secs(1));

    // cage -s -- sh -c "sleep 2 && exec /sbin/magnolia-hub"
    // The 2-second delay allows Cage/wlroots to fully initialize the XDG shell
    // protocol before magnolia-hub creates its first surface, preventing the
    // wlr_xdg_surface_schedule_configure assertion failure.
    let mut hub = Command::new("cage")
        .args([
            "-s",
            "--",
            "/bin/sh",
            "-c",
            "sleep 2 && exec /sbin/magnolia-hub",
        ])
        .spawn()
        .expect("[Magnolia FATAL] Failed to launch cage/magnolia-hub");

    println!(
        "[Magnolia] Supervisor active. Monitoring Hub (PID {})...",
        hub.id()
    );

    // 5. Signal Handling for Graceful Shutdown
    let running = Arc::new(AtomicBool::new(true));

    unsafe {
        let _ = signal::signal(Signal::SIGTERM, SigHandler::Handler(handle_sigterm));
        let _ = signal::signal(Signal::SIGINT, SigHandler::Handler(handle_sigint));
    }

    // 6. Keep PID 1 alive and reap orphans
    loop {
        if !running.load(Ordering::SeqCst) {
            break;
        }

        match hub.try_wait() {
            Ok(Some(status)) => {
                println!(
                    "[Magnolia] Dashboard Hub exited with {}. Restarting...",
                    status
                );
                thread::sleep(Duration::from_secs(5));
                hub = Command::new("cage")
                    .args([
                        "-s",
                        "--",
                        "/bin/sh",
                        "-c",
                        "sleep 2 && exec /sbin/magnolia-hub",
                    ])
                    .spawn()
                    .expect("[Magnolia FATAL] Failed to relaunch cage/magnolia-hub");
            }
            Ok(None) => {
                thread::sleep(Duration::from_secs(10));
            }
            Err(e) => {
                eprintln!("[Magnolia ERROR] Error monitoring hub: {}", e);
                thread::sleep(Duration::from_secs(10));
            }
        }
    }
}
