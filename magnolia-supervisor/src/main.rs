use std::process::Command;
use std::fs;
use std::thread;
use std::time::Duration;
use nix::mount::{mount, MsFlags};
use nix::sys::signal::{self, Signal, SigHandler};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

extern "C" fn handle_sigterm(_: i32) {
    // Note: println! is not strictly async-signal-safe but acceptable for PID 1 shutdown log
    println!("[Magnolia] Received SIGTERM. Commencing graceful powerdown...");
    std::process::exit(0);
}

extern "C" fn handle_sigint(_: i32) {
    println!("[Magnolia] Received SIGINT. Re-initializing graphics...");
}

fn main() {
    println!("[Magnolia] Initializing Sovereign Supervisor (PID 1)...");

    // 1. Mount essential filesystems using direct Syscalls
    let mounts: [(Option<&str>, &str, Option<&str>, MsFlags, Option<&str>); 5] = [
        (Some("proc"), "/proc", Some("proc"), MsFlags::empty(), None),
        (Some("sysfs"), "/sys", Some("sysfs"), MsFlags::empty(), None),
        (Some("devtmpfs"), "/dev", Some("devtmpfs"), MsFlags::empty(), None),
        (Some("tmpfs"), "/tmp", Some("tmpfs"), MsFlags::empty(), None),
        (Some("tmpfs"), "/run", Some("tmpfs"), MsFlags::empty(), None),
    ];

    for (source, target, fstype, flags, data) in mounts {
        println!("[Magnolia] Syscall Mounting {} to {}...", fstype.unwrap_or("none"), target);
        let _ = fs::create_dir_all(target);
        if let Err(e) = mount(source, target, fstype, flags, data) {
            eprintln!("[Magnolia ERROR] Syscall failed for {}: {}", target, e);
        }
    }

    // 1.1 Mount Persistent Partitions (Steel Implementation)
    // Dynamic detection of boot media (vda for Virtio, sda for SATA/SCSI)
    let mut boot_disk = "/dev/vda";
    if !fs::metadata("/dev/vda").is_ok() {
        if fs::metadata("/dev/sda").is_ok() {
            println!("[Magnolia] Virtio disk not found. Falling back to /dev/sda.");
            boot_disk = "/dev/sda";
        } else {
            println!("[Magnolia WARNING] No primary boot disk (vda/sda) detected. Persistence may fail.");
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
        println!("[Magnolia] Attempting to mount persistent storage {} to {}...", dev, target);
        let _ = fs::create_dir_all(target);
        // Retry loop for disk readiness
        let mut attempts = 0;
        while attempts < 5 {
            if mount(Some(dev), target, Some(fstype), MsFlags::empty(), None::<&str>).is_ok() {
                println!("[Magnolia] Successfully mounted persistence layer: {}", target);
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
        // Force software rendering for stable simulation in virtualized/headless environments
        std::env::set_var("WLR_RENDERER", "pixman");
        std::env::set_var("WLR_NO_HARDWARE_CURSORS", "1");
    }
    
    // Start udev daemon to populate devices (DRM, input)
    println!("[Magnolia] Starting udev daemon...");
    let _udevd = Command::new("/sbin/udevd")
        .arg("--daemon")
        .spawn();

    println!("[Magnolia] Triggering uevents...");
    let _ = Command::new("/bin/udevadm")
        .args(["trigger", "--type=subsystems", "--action=add"])
        .status();
    let _ = Command::new("/bin/udevadm")
        .args(["trigger", "--type=devices", "--action=add"])
        .status();
    let _ = Command::new("/bin/udevadm")
        .args(["settle"])
        .status();

    // 4. Launch the Magnolia Hub (Tauri) via Cage Compositor
    println!("[Magnolia] Launching Magnolia Dashboard Hub on Cage...");
    thread::sleep(Duration::from_secs(1));

    // cage -s -- /sbin/magnolia-hub
    let mut hub = Command::new("cage")
        .args(["-s", "--", "/sbin/magnolia-hub"])
        .spawn()
        .expect("[Magnolia FATAL] Failed to launch cage/magnolia-hub");

    println!("[Magnolia] Supervisor active. Monitoring Hub (PID {})...", hub.id());

    // 5. Signal Handling for Graceful Shutdown
    let running = Arc::new(AtomicBool::new(true));

    unsafe {
        let _ = signal::signal(Signal::SIGTERM, SigHandler::Handler(handle_sigterm));
        let _ = signal::signal(Signal::SIGINT, SigHandler::Handler(handle_sigint));
    }

    // 6. Keep PID 1 alive and reap orphans
    loop {
        if !running.load(Ordering::SeqCst) { break; }
        
        match hub.try_wait() {
            Ok(Some(status)) => {
                println!(
                    "[Magnolia] Dashboard Hub exited with {}. Restarting...",
                    status
                );
                thread::sleep(Duration::from_secs(5));
                hub = Command::new("cage")
                    .args(["-s", "--", "/sbin/magnolia-hub"])
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
