use crate::system;
use tauri::Manager;

#[tauri::command]
pub async fn spawn_browser_view(
    _app: tauri::AppHandle,
    label: String,
    url: String,
    _x: f64,
    _y: f64,
    _width: f64,
    _height: f64,
) -> Result<(), String> {
    let sandbox = system::sandbox::SovereignSandbox::new(&label, &url);
    sandbox.spawn_browser()?;
    Ok(())
}

#[tauri::command]
pub async fn sync_browser_view(
    app: tauri::AppHandle,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(view) = app.get_webview_window(&label) {
        view.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: x as i32,
            y: y as i32,
        }))
        .map_err(|e| e.to_string())?;
        view.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: width as u32,
            height: height as u32,
        }))
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn detach_browser_view(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(view) = app.get_webview_window(&label) {
        view.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}
