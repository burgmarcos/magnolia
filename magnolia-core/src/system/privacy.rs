use serde::{Serialize, Deserialize};
use tauri::command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HwUsage {
    pub app_id: String,
    pub hardware_type: String, // "camera" or "microphone"
}

#[command]
pub async fn get_hardware_telemetry() -> Result<Vec<HwUsage>, String> {
    println!("[PRIVACY] Hardware telemetry request...");
    
    // In a production Linux environment, we would scan:
    // 1. /proc/<pid>/fd/ looking for /dev/video* (Camera)
    // 2. pactl list clients (PulseAudio/PipeWire) for recording streams
    
    // For the current Magnolia 1.0 architecture, we return mocked usage 
    // to demonstrate the UI behavior.
    Ok(vec![
        // HwUsage { app_id: "Sovereign Browser".into(), hardware_type: "camera".into() },
        // HwUsage { app_id: "Meeting Hub".into(), hardware_type: "microphone".into() },
    ])
}
