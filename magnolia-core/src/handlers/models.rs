use crate::downloader;
use crate::huggingface;
use crate::secrets;
use crate::telemetry;

#[tauri::command]
pub async fn download_model_file(
    app: tauri::AppHandle,
    url: String,
    filename: String,
) -> Result<(), String> {
    downloader::download_model(app, url, filename).await
}

#[tauri::command]
pub async fn search_hf_models(model_id: String) -> Result<huggingface::HfModelInfo, String> {
    let token = secrets::get_api_key("huggingface").map_err(|e| {
        println!("Keyring access warning: {}", e);
        "HF API Key not found. Please set it in Models Hub.".to_string()
    })?;

    huggingface::fetch_hf_model_size(&model_id, Some(token)).await
}

#[tauri::command]
pub fn assess_model_fit(model_size_bytes: u64) -> String {
    let specs = telemetry::get_system_specs();
    let buffer: u64 = 2 * 1024 * 1024 * 1024; // 2GB buffer
    let required_memory = model_size_bytes + buffer;

    if specs.total_vram_bytes > 0 && required_memory <= specs.total_vram_bytes {
        return "Fits Perfectly".into();
    }

    if required_memory <= specs.total_ram_bytes {
        return "Needs Offload".into();
    }

    "Does Not Run".into()
}

#[tauri::command]
pub fn get_local_models(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let models_dir = app_data_dir.join("models");

    let mut models = Vec::new();

    if models_dir.exists() && models_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(models_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "gguf" {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                models.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
    } else {
        let _ = std::fs::create_dir_all(&models_dir);
    }

    Ok(models)
}

#[tauri::command]
pub fn get_local_model_size_bytes(
    app: tauri::AppHandle,
    model_name: String,
) -> Result<u64, String> {
    use tauri::Manager;
    let models_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");
    let path = models_dir.join(&model_name);
    path.metadata()
        .map(|m| m.len())
        .map_err(|e| format!("Cannot stat model file: {}", e))
}
