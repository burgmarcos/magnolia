use std::fs;
use std::process::Command;
use std::thread;
use std::time::Duration;

fn main() {
    println!("[Magnolia] Initializing Sovereign Supervisor (PID 1)...");

    // 1. Mount essential filesystems
    let mounts = [
        ("proc", "/proc", "proc"),
        ("sysfs", "/sys", "sysfs"),
        ("devtmpfs", "/dev", "devtmpfs"),
        ("tmpfs", "/tmp", "tmpfs"),
        ("tmpfs", "/run", "tmpfs"),
    ];

    for (source, target, fstype) in mounts {
        println!("[Magnolia] Mounting {} to {}...", fstype, target);
        let _ = fs::create_dir_all(target);
        let status = Command::new("mount")
            .args(["-t", fstype, source, target])
            .status();

        if let Err(e) = status {
            eprintln!("[Magnolia ERROR] Failed to mount {}: {}", target, e);
        }
    }

    // 2. Set Hostname
    println!("[Magnolia] Setting hostname to 'burg'...");
    let _ = fs::write("/proc/sys/kernel/hostname", "burg");

    // 3. Environment Preparation
    println!("[Magnolia] Bridging system nodes...");
    let _ = Command::new("mdev").arg("-s").status(); // Populate /dev

    // 4. Launch the Magnolia Hub (Tauri)
    // We launch this in the background or replace our process
    println!("[Magnolia] Launching Magnolia Dashboard Hub...");

    // Give the system a second to settle
    thread::sleep(Duration::from_secs(1));

    let mut hub = Command::new("/usr/bin/Magnolia-hub")
        .spawn()
        .expect("[Magnolia FATAL] Failed to launch Magnolia-hub");

    println!(
        "[Magnolia] Supervisor active. Monitoring Hub (PID {})...",
        hub.id()
    );

    // 5. Keep PID 1 alive and reap orphans
    loop {
        match hub.try_wait() {
            Ok(Some(status)) => {
                println!(
                    "[Magnolia] Dashboard Hub exited with {}. Restarting...",
                    status
                );
                thread::sleep(Duration::from_secs(5));
                hub = Command::new("/usr/bin/Magnolia-hub")
                    .spawn()
                    .expect("[Magnolia FATAL] Failed to relaunch Magnolia-hub");
            }
            Ok(None) => {
                // Reap any orphan processes that got parented to PID 1
                // (In a minimal rust init, we just sleep)
                thread::sleep(Duration::from_secs(10));
            }
            Err(e) => {
                eprintln!("[Magnolia ERROR] Error monitoring hub: {}", e);
                thread::sleep(Duration::from_secs(10));
            }
        }
    }
}
