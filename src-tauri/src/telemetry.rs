use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::System;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HardwareSpecs {
    pub total_ram_bytes: u64,
    pub free_ram_bytes: u64,
    pub total_vram_bytes: u64,
    pub vendor: String,
}

pub fn get_system_specs() -> HardwareSpecs {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_ram_bytes = sys.total_memory();
    let free_ram_bytes = sys.free_memory();

    // Attempt to parse VRAM using nvidia-smi
    let mut total_vram_bytes = 0;
    let mut vendor = "Unknown".to_string();

    let output = Command::new("nvidia-smi")
        .args(&["--query-gpu=memory.total", "--format=csv,noheader,nounits"])
        .output();

    if let Ok(cmd_out) = output {
        if cmd_out.status.success() {
            let output_str = String::from_utf8_lossy(&cmd_out.stdout);
            // Example output: "8192\n" -> 8192 MB -> convert to bytes
            if let Some(first_line) = output_str.lines().next() {
                if let Ok(mb) = first_line.trim().parse::<u64>() {
                    total_vram_bytes = mb * 1024 * 1024;
                    vendor = "NVIDIA".to_string();
                }
            }
        }
    }

    // If we're on Apple Silicon, unified memory means RAM == VRAM ideally,
    // but we'll let the model size estimator handle it using system RAM anyway.

    HardwareSpecs {
        total_ram_bytes,
        free_ram_bytes,
        total_vram_bytes,
        vendor,
    }
}
