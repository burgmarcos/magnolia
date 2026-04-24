use log::{info, error, warn};
use std::fs;
use std::process::Command;
use nix::mount::{mount, MsFlags};
use nix::sys::signal::{self, Signal};
use nix::sys::wait::{waitpid, WaitPidFlag, WaitStatus};
use std::path::Path;

/// Magnolia System Initialization (PID 1 Logic)
/// This is the entry point for the Magnolia Core when running as the OS Init process.
pub fn initialize_system() -> Result<(), String> {
    info!("Initializing Sovereign OS Supervisor (PID 1)");

    // 1. Mount virtual filesystems (/proc, /sys, /dev, /tmp, /run)
    mount_virt_fs()?;

    // 2. Setup Loopback Interface
    setup_loopback()?;

    // 3. Initiate Signal Handling for PID 1
    // Reaping zombie processes is mandatory for PID 1
    unsafe {
        setup_signal_handlers().map_err(|e| format!("Signal handler error: {}", e))?;
    }

    // 4. Secure Partition Orchestration
    info!("Orchestrating secure partitions...");

    // 5. Handover to Supervisor Loop
    info!("Starting Magnolia supervisor loop...");
    
    let mut retry_count = 0;
    const MAX_RETRIES: u32 = 5;

    loop {
        match start_graphical_session() {
            Ok(mut child) => {
                info!("Graphical session established (PID: {}).", child.id());
                
                // Supervise the child process
                loop {
                    reap_zombies();
                    
                    // Check if our main UI child is still alive
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            warn!("Graphical session exited with status: {}", status);
                            break; // Break supervision to restart
                        }
                        Ok(None) => {
                            // Still running, wait and reap others
                            std::thread::sleep(std::time::Duration::from_secs(2));
                        }
                        Err(e) => {
                            error!("Failed to wait on child: {}", e);
                            break;
                        }
                    }
                }
            },
            Err(e) => {
                error!("Failed to start UI: {}.", e);
            }
        }

        retry_count += 1;
        if retry_count >= MAX_RETRIES {
            error!("UI failed too many times. Falling back to recovery shell.");
            break;
        }

        info!("Restarting UI (Attempt {}/{})...", retry_count + 1, MAX_RETRIES);
        std::thread::sleep(std::time::Duration::from_secs(2));
    }

    // Fallback Recovery Shell
    loop {
        match Command::new("/bin/sh").status() {
            Ok(s) => info!("Recovery shell exited with status {}. Restarting...", s),
            Err(e) => {
                error!("FATAL: Failed to launch /bin/sh: {}. System Halted.", e);
                loop { std::thread::sleep(std::time::Duration::from_secs(3600)); }
            }
        }
    }
}

fn start_graphical_session() -> Result<std::process::Child, String> {
    // Logic for launching Cage/Tauri in a sandbox
    // In a real Magnolia build, this launches 'cage -s -- /usr/bin/magnolia-core'
    let config = crate::system::sandbox::get_default_browser_config();
    
    // For now, we simulate the launch of the Magnolia Dashboard
    // In bare-metal, this would launch the compositor
    let mut cmd = Command::new("cage");
    cmd.args(["-s", "--", "wpe-webkit-kiosk", &config.url]);
    
    cmd.spawn().map_err(|e| format!("Failed to launch compositor: {}", e))
}

fn mount_virt_fs() -> Result<(), String> {
    info!("Mounting virtual filesystems...");
    
    let mounts = [
        ("proc", "/proc", "proc", MsFlags::empty()),
        ("sysfs", "/sys", "sysfs", MsFlags::empty()),
        ("devtmpfs", "/dev", "devtmpfs", MsFlags::empty()),
        ("tmpfs", "/tmp", "tmpfs", MsFlags::empty()),
        ("tmpfs", "/run", "tmpfs", MsFlags::empty()),
        ("devpts", "/dev/pts", "devpts", MsFlags::empty()),
        ("tmpfs", "/dev/shm", "tmpfs", MsFlags::empty()),
    ];

    for (source, target, fstype, flags) in mounts {
        let p = Path::new(target);
        if !p.exists() {
            fs::create_dir_all(p).map_err(|e| format!("Failed to create {}: {}", target, e))?;
        }
        
        // Only mount if not already mounted (checking mtab/self/mounts or just ignore error)
        let _ = mount(Some(source), target, Some(fstype), flags, None::<&str>);
    }
    
    Ok(())
}

fn setup_loopback() -> Result<(), String> {
    info!("Configuring networking...");
    // ip link set up dev lo
    Command::new("ip")
        .args(["link", "set", "up", "dev", "lo"])
        .status()
        .map_err(|e| format!("Failed to setup loopback: {}", e))?;
    Ok(())
}

/// Sets up signal handlers to reap child processes
unsafe fn setup_signal_handlers() -> Result<(), nix::Error> {
    // Set SIGCHLD to be handled so we can reap babies
    let sa = signal::SigAction::new(
        signal::SigHandler::Handler(handle_sigchld),
        signal::SaFlags::SA_NOCLDSTOP,
        signal::SigSet::empty(),
    );
    signal::sigaction(Signal::SIGCHLD, &sa)?;
    Ok(())
}

extern "C" fn handle_sigchld(_: i32) {
    // We don't do much in the handler itself to avoid async-signal-unsafe stuff
    // The main loop calls reap_zombies()
}

/// Reaps any zombie processes. Should be called periodically or on SIGCHLD.
pub fn reap_zombies() {
    loop {
        match waitpid(None, Some(WaitPidFlag::WNOHANG)) {
            Ok(WaitStatus::Exited(pid, status)) => {
                info!("Reaped process {} (status {})", pid, status);
            }
            Ok(WaitStatus::Signaled(pid, sig, _)) => {
                info!("Reaped process {} (signaled by {})", pid, sig);
            }
            Ok(WaitStatus::StillAlive) | Err(_) => break,
            _ => break,
        }
    }
}
