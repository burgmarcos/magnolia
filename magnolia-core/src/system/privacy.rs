use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;
use tauri::command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HwUsage {
    pub app_id: String,
    pub hardware_type: String, // "camera" or "microphone"
}

#[command]
pub async fn get_hardware_telemetry() -> Result<Vec<HwUsage>, String> {
    println!("[PRIVACY] Hardware telemetry scan...");
    let mut usages = Vec::new();

    // Scan /proc/<pid>/fd/ for processes accessing /dev/video* (camera)
    if let Ok(proc_entries) = fs::read_dir("/proc") {
        for entry in proc_entries.flatten() {
            let pid_str = entry.file_name().to_string_lossy().to_string();
            if !pid_str.chars().all(|c| c.is_ascii_digit()) {
                continue;
            }
            let fd_dir = format!("/proc/{}/fd", pid_str);
            if let Ok(fds) = fs::read_dir(&fd_dir) {
                let mut has_camera = false;
                for fd in fds.flatten() {
                    if let Ok(link) = fs::read_link(fd.path()) {
                        let link_str = link.to_string_lossy();
                        if link_str.starts_with("/dev/video") {
                            has_camera = true;
                            break;
                        }
                    }
                }
                if has_camera {
                    let comm = fs::read_to_string(format!("/proc/{}/comm", pid_str))
                        .unwrap_or_else(|_| "unknown".to_string())
                        .trim()
                        .to_string();
                    usages.push(HwUsage {
                        app_id: comm,
                        hardware_type: "camera".into(),
                    });
                }
            }
        }
    }

    // Scan PipeWire/PulseAudio for active recording streams (microphone)
    if let Ok(output) = Command::new("pactl")
        .args(["list", "source-outputs", "short"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            // Format: index\tdriver\tsource\tsample_spec\tstate
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 2 {
                let client_name = parts[1].to_string();
                if !client_name.is_empty() {
                    usages.push(HwUsage {
                        app_id: client_name,
                        hardware_type: "microphone".into(),
                    });
                }
            }
        }
    }

    Ok(usages)
}
