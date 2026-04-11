use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::System;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HardwareSpecs {
    pub total_ram_bytes: u64,
    pub free_ram_bytes: u64,
    pub total_vram_bytes: u64,
    pub vendor: String,
    pub cpu_brand: String,
    pub screen_resolution: String,
    pub uptime_seconds: u64,
    pub software_version: String,
}

pub fn get_system_specs() -> HardwareSpecs {
    let mut sys = System::new_all();
    sys.refresh_all(); // Includes CPU info data refresh

    let total_ram_bytes = sys.total_memory();
    let free_ram_bytes = sys.free_memory();
    let cpu_brand = sys.global_cpu_info().brand().to_string();
    let uptime_seconds = System::uptime();
    let software_version = env!("CARGO_PKG_VERSION").to_string();

    // Attempt to parse VRAM using nvidia-smi
    let mut total_vram_bytes = 0;
    let mut vendor = "Core Graphics".to_string();

    let mut cmd = Command::new("nvidia-smi");
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    cmd.args(["--query-gpu=memory.total", "--format=csv,noheader,nounits"]);

    let output = cmd.output();

    if let Ok(cmd_out) = output {
        if cmd_out.status.success() {
            let output_str = String::from_utf8_lossy(&cmd_out.stdout);
            if let Some(first_line) = output_str.lines().next() {
                if let Ok(mb) = first_line.trim().parse::<u64>() {
                    total_vram_bytes = mb * 1024 * 1024;
                    vendor = "NVIDIA".to_string();
                }
            }
        }
    }

    HardwareSpecs {
        total_ram_bytes,
        free_ram_bytes,
        total_vram_bytes,
        vendor,
        cpu_brand,
        screen_resolution: "Unknown".to_string(),
        uptime_seconds,
        software_version,
    }
}

pub fn get_screen_resolution(app: &tauri::AppHandle) -> String {
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let size = monitor.size();
        format!("{}x{}", size.width, size.height)
    } else {
        "Unknown".to_string()
    }
}
