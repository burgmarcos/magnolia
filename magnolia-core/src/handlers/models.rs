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

pub fn assess_model_fit_internal(
    model_size_bytes: u64,
    specs: &telemetry::HardwareSpecs,
) -> String {
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
pub fn assess_model_fit(model_size_bytes: u64) -> String {
    let specs = telemetry::get_system_specs();
    assess_model_fit_internal(model_size_bytes, &specs)
}

#[derive(serde::Serialize)]
pub struct LocalModelInfo {
    pub name: String,
    pub fit_status: String,
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
pub fn get_all_local_models_info(app: tauri::AppHandle) -> Result<Vec<LocalModelInfo>, String> {
    let models = get_local_models(app.clone())?;
    let mut infos = Vec::with_capacity(models.len());
    let specs = crate::telemetry::get_system_specs();

    for name in models {
        let fit_status = match get_local_model_size_bytes(app.clone(), name.clone()) {
            Ok(size_bytes) => assess_model_fit_internal(size_bytes, &specs),
            Err(_) => "Does Not Run".to_string(),
        };
        infos.push(LocalModelInfo { name, fit_status });
    }
    Ok(infos)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::telemetry::HardwareSpecs;

    fn get_dummy_specs(total_ram: u64, total_vram: u64) -> HardwareSpecs {
        HardwareSpecs {
            total_ram_bytes: total_ram,
            free_ram_bytes: total_ram, // not used in logic
            total_vram_bytes: total_vram,
            vendor: "Test Vendor".to_string(),
            cpu_brand: "Test CPU".to_string(),
            screen_resolution: "1920x1080".to_string(),
            uptime_seconds: 0,
            software_version: "test".to_string(),
        }
    }

    #[test]
    fn test_fits_perfectly() {
        // Model size: 1GB, requires 1GB + 2GB buffer = 3GB
        let model_size = 1024 * 1024 * 1024;
        let vram = 4 * 1024 * 1024 * 1024; // 4GB VRAM
        let specs = get_dummy_specs(8 * 1024 * 1024 * 1024, vram);

        let result = assess_model_fit_internal(model_size, &specs);
        assert_eq!(result, "Fits Perfectly");
    }

    #[test]
    fn test_needs_offload_due_to_vram() {
        // Model size: 3GB, requires 3GB + 2GB buffer = 5GB
        let model_size = 3 * 1024 * 1024 * 1024;
        let vram = 4 * 1024 * 1024 * 1024; // 4GB VRAM (Insufficient)
        let ram = 8 * 1024 * 1024 * 1024; // 8GB RAM (Sufficient)
        let specs = get_dummy_specs(ram, vram);

        let result = assess_model_fit_internal(model_size, &specs);
        assert_eq!(result, "Needs Offload");
    }

    #[test]
    fn test_does_not_run() {
        // Model size: 6GB, requires 6GB + 2GB buffer = 8GB
        let model_size = 6 * 1024 * 1024 * 1024;
        let vram = 2 * 1024 * 1024 * 1024; // 2GB VRAM (Insufficient)
        let ram = 6 * 1024 * 1024 * 1024; // 6GB RAM (Insufficient)
        let specs = get_dummy_specs(ram, vram);

        let result = assess_model_fit_internal(model_size, &specs);
        assert_eq!(result, "Does Not Run");
    }

    #[test]
    fn test_zero_vram() {
        // Model size: 2GB, requires 2GB + 2GB buffer = 4GB
        let model_size = 2 * 1024 * 1024 * 1024;
        let vram = 0; // 0GB VRAM
        let ram = 8 * 1024 * 1024 * 1024; // 8GB RAM (Sufficient)
        let specs = get_dummy_specs(ram, vram);

        let result = assess_model_fit_internal(model_size, &specs);
        // It shouldn't fit perfectly since vram = 0
        assert_eq!(result, "Needs Offload");
    }
}
