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
    pub total_bytes: Option<u64>,
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

    let total_size = res.content_length();

    let mut file = File::create(&file_path)
        .await
        .map_err(|e| format!("Could not create file: {}", e))?;
    let mut stream = res.bytes_stream();
    let mut downloaded: u64 = 0;

    let mut last_percentage_emit: f64 = 0.0;
    let mut last_bytes_emit: u64 = 0;

    // Safely pipe bytes off RAM and onto disk in steady chunks
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;

        downloaded += chunk.len() as u64;
        let percentage = total_size
            .filter(|&total| total > 0)
            .map(|total| (downloaded as f64 / total as f64 * 100.0).min(100.0))
            .unwrap_or(0.0);

        // Emit events back to the UI, throttle to only emit on > 1% changes to avoid UI thread spam
        // If total_size is unknown, emit every 10MB to avoid spam
        let should_emit = if let Some(total) = total_size {
            (percentage - last_percentage_emit > 1.0) || downloaded == total
        } else {
            downloaded - last_bytes_emit > 10 * 1024 * 1024
        };

        if should_emit {
            let payload = DownloadPayload {
                filename: filename.clone(),
                percentage,
                bytes_downloaded: downloaded,
                total_bytes: total_size,
            };

            // Emit directly bypassing invoke channel limits
            let _ = app.emit("download-progress", payload);
            last_percentage_emit = percentage;
            last_bytes_emit = downloaded;
        }
    }

    // Final emission for unknown size to ensure UI gets final state
    if total_size.is_none() && downloaded > last_bytes_emit {
        let payload = DownloadPayload {
            filename: filename.clone(),
            percentage: 100.0,
            bytes_downloaded: downloaded,
            total_bytes: total_size,
        };
        let _ = app.emit("download-progress", payload);
    }

    Ok(())
}
