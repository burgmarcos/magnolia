use chrono::Local;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

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
    let status = Command::new("grim").arg(path_str).status();

    match status {
        Ok(s) if s.success() => {
            println!("[MEDIA] Screenshot saved: {}", path_str);
            Ok(path_str.to_string())
        }
        Ok(_) => {
            Err("grim failed to capture screen (non-zero exit). Check compositor status.".into())
        }
        Err(e) => {
            println!("[MEDIA WARN] grim not available: {}", e);
            // grim unavailable — try ImageMagick import as fallback (X11/headless envs)
            let import_status = Command::new("import")
                .args(["-window", "root", path_str])
                .status();
            match import_status {
                Ok(s) if s.success() => {
                    println!("[MEDIA] Screenshot saved via import: {}", path_str);
                    Ok(path_str.to_string())
                }
                _ => Err("Screenshot unavailable: neither grim nor ImageMagick import found. Ensure a Wayland compositor is running.".into()),
            }
        }
    }
}
