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

    // 1.1 Mount Persistent Partitions (Steel Implementation)
    // Dynamic detection of boot media (vda for Virtio, sda for SATA/SCSI)
    let mut boot_disk = "/dev/vda";
    if fs::metadata("/dev/vda").is_err() {
        if fs::metadata("/dev/sda").is_ok() {
            println!("[Magnolia] Virtio disk not found. Falling back to /dev/sda.");
            boot_disk = "/dev/sda";
        } else {
            println!(
                "[Magnolia WARNING] No primary boot disk (vda/sda) detected. Persistence may fail."
            );
        }
    }

    // According to genimage.cfg:
    // Partition 4: appdata
    // Partition 5: userdata
    let apps_dev = format!("{}4", boot_disk);
    let user_dev = format!("{}5", boot_disk);

    let persistent_mounts = [
        (apps_dev.as_str(), "/data", "ext4"),
        (user_dev.as_str(), "/home/sovereign", "ext4"),
    ];

    for (dev, target, fstype) in persistent_mounts {
        println!(
            "[Magnolia] Attempting to mount persistent storage {} to {}...",
            dev, target
        );
        let _ = fs::create_dir_all(target);
        // Retry loop for disk readiness
        let mut attempts = 0;
        while attempts < 5 {
            if mount(
                Some(dev),
                target,
                Some(fstype),
                MsFlags::empty(),
                None::<&str>,
            )
            .is_ok()
            {
                println!(
                    "[Magnolia] Successfully mounted persistence layer: {}",
                    target
                );
                break;
            }
            attempts += 1;
            thread::sleep(Duration::from_millis(500 * attempts));
        }
    }

    // 2. Set Hostname
    println!("[Magnolia] Setting hostname to 'burg'...");
    let _ = fs::write("/proc/sys/kernel/hostname", "burg");

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
        .args(["-s", "--", "/bin/sh", "-c", "sleep 2 && exec /sbin/magnolia-hub"])
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
                    .args(["-s", "--", "/bin/sh", "-c", "sleep 2 && exec /sbin/magnolia-hub"])
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
