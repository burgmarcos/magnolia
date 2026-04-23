use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadPayload {
    pub filename: String,
    pub percentage: f64,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
}

pub async fn download_model(app: AppHandle, url: String, filename: String) -> Result<(), String> {
    // Ensure the models directory exists inside the AppData hierarchy
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let models_dir = app_data_dir.join("models");

    if !models_dir.exists() {
        fs::create_dir_all(&models_dir)
            .await
            .map_err(|e| e.to_string())?;
    }

    let file_path = models_dir.join(&filename);

    let client = Client::builder()
        .timeout(Duration::from_secs(60 * 60)) // 1 hr timeout for massive binaries
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed to start: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    let total_size = res.content_length().unwrap_or(1).max(1); // Default to 1 to prevent division by 0 UI bugs

    let mut file = File::create(&file_path)
        .await
        .map_err(|e| format!("Could not create file: {}", e))?;
    let mut stream = res.bytes_stream();
    let mut downloaded: u64 = 0;

    let mut last_percentage_emit: f64 = 0.0;

    // Safely pipe bytes off RAM and onto disk in steady chunks
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;

        downloaded += chunk.len() as u64;
        let percentage = ((downloaded as f64 / total_size as f64) * 100.0).min(100.0);

        // Emit events back to the UI, throttle to only emit on > 1% changes to avoid UI thread spam
        if percentage - last_percentage_emit > 1.0 || downloaded == total_size {
            let payload = DownloadPayload {
                filename: filename.clone(),
                percentage,
                bytes_downloaded: downloaded,
                total_bytes: total_size,
            };

            // Emit directly bypassing invoke channel limits
            let _ = app.emit("download-progress", payload);
            last_percentage_emit = percentage;
        }
    }

    Ok(())
}
