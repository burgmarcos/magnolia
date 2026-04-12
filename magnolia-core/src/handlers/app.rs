use crate::installer;
use crate::telemetry;

#[tauri::command]
pub fn get_launch_mode() -> String {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|arg| arg == "--uninstall") {
        return "uninstaller".to_string();
    }

    if !installer::is_installed() {
        return "installer".to_string();
    }

    "main".to_string()
}

#[tauri::command]
pub fn get_app_status() -> String {
    "System Online".into()
}

#[tauri::command]
pub async fn get_hardware_specs(app: tauri::AppHandle) -> Result<telemetry::HardwareSpecs, String> {
    tokio::task::spawn_blocking(move || {
        let mut specs = telemetry::get_system_specs();
        specs.screen_resolution = telemetry::get_screen_resolution(&app);
        specs
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn refresh_hardware_specs(
    app: tauri::AppHandle,
) -> Result<telemetry::HardwareSpecs, String> {
    get_hardware_specs(app).await
}
