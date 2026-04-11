use std::process::Command;
use std::path::PathBuf;
use tauri::command;
use chrono::Local;

#[command]
pub async fn take_screenshot() -> Result<String, String> {
    println!("[MEDIA] Capture requested...");
    
    // Ensure Screenshot directory exists
    let screenshot_path = PathBuf::from("/data/Pictures/Screenshots");
    if !screenshot_path.exists() {
        std::fs::create_dir_all(&screenshot_path).map_err(|e| e.to_string())?;
    }
    
    // Generate filename based on timestamp
    let now = Local::now();
    let filename = format!("Magnolia_Capture_{}.png", now.format("%Y%m%d_%H%M%S"));
    let full_path = screenshot_path.join(&filename);
    let path_str = full_path.to_str().ok_or("Invalid path encoding")?;

    // grim is the standard screenshot tool for Wayland (used in cage)
    let status = Command::new("grim")
        .arg(path_str)
        .status();

    match status {
        Ok(s) if s.success() => {
            println!("[MEDIA] Screenshot saved: {}", path_str);
            Ok(path_str.to_string())
        },
        Ok(_) => Err("grim failed to capture screen (non-zero exit). Check compositor status.".into()),
        Err(e) => {
            println!("[MEDIA WARN] grim not found, falling back to mock: {}", e);
            // Mocking for environments without grim (Development)
            Ok(format!("MOCK_CAPTURE:{}", path_str))
        }
    }
}
