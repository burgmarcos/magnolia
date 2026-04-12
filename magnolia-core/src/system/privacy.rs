use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HwUsage {
    pub app_id: String,
    pub hardware_type: String, // "camera" or "microphone"
}

#[command]
pub async fn get_hardware_telemetry() -> Result<Vec<HwUsage>, String> {
    println!("[PRIVACY] Hardware telemetry request...");

    let mut usages: Vec<HwUsage> = Vec::new();

    // 1. Camera access: scan /proc/*/fd/ for symlinks pointing to /dev/video*
    if let Ok(proc_entries) = std::fs::read_dir("/proc") {
        for entry in proc_entries.filter_map(|e| e.ok()) {
            let fd_path = entry.path().join("fd");
            if !fd_path.is_dir() {
                continue;
            }
            // Read the process name from /proc/<pid>/comm
            let pid_str = entry.file_name().to_string_lossy().to_string();
            if !pid_str.chars().all(|c| c.is_ascii_digit()) {
                continue;
            }
            let comm = std::fs::read_to_string(entry.path().join("comm"))
                .unwrap_or_else(|_| pid_str.clone())
                .trim()
                .to_string();

            if let Ok(fds) = std::fs::read_dir(&fd_path) {
                for fd in fds.filter_map(|f| f.ok()) {
                    if let Ok(target) = std::fs::read_link(fd.path()) {
                        let target_str = target.to_string_lossy();
                        if target_str.starts_with("/dev/video") {
                            usages.push(HwUsage {
                                app_id: comm.clone(),
                                hardware_type: "camera".into(),
                            });
                            break; // one entry per process is enough
                        }
                    }
                }
            }
        }
    }

    // 2. Microphone/audio capture: run pactl to list active recording clients
    if let Ok(output) = std::process::Command::new("pactl")
        .args(["list", "clients", "short"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            // pactl short format: "<id>\t<driver>\t<client-name>"
            let parts: Vec<&str> = line.splitn(3, '\t').collect();
            if let Some(client_name) = parts.get(2) {
                usages.push(HwUsage {
                    app_id: client_name.trim().to_string(),
                    hardware_type: "microphone".into(),
                });
            }
        }
    }

    Ok(usages)
}
