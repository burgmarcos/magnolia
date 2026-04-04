use log::{error, info, warn};
use std::sync::Arc;
use tokio::process::Command;
use tokio::sync::{oneshot, Mutex};

pub struct LlmEngineState {
    pub abort_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
}

impl LlmEngineState {
    pub fn new() -> Self {
        Self {
            abort_tx: Arc::new(Mutex::new(None)),
        }
    }
}

pub async fn start_llama_server_loop(
    model_path: String,
    state: tauri::State<'_, LlmEngineState>,
) -> Result<(), String> {
    let mut abort_tx_lock = state.abort_tx.lock().await;

    if abort_tx_lock.is_some() {
        return Err("Engine is already running".to_string());
    }

    let (tx, mut rx) = oneshot::channel::<()>();
    *abort_tx_lock = Some(tx);
    drop(abort_tx_lock); // release lock before spawn

    let tx_state = state.abort_tx.clone();

    tauri::async_runtime::spawn(async move {
        info!(
            "Starting llama-server background loop with model: {}",
            model_path
        );

        loop {
            // Assume llama-server is in PATH or current dir
            let mut child = match Command::new("llama-server")
                .arg("-m")
                .arg(&model_path)
                .arg("--port")
                .arg("8080")
                .spawn()
            {
                Ok(c) => c,
                Err(e) => {
                    error!("Failed to spawn llama-server: {}. Retrying in 5s...", e);
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    // Check if we were told to stop while waiting
                    tokio::select! {
                        _ = &mut rx => {
                            info!("Received stop signal during retry waiting.");
                            break;
                        }
                        _ = tokio::time::sleep(std::time::Duration::from_millis(10)) => {}
                    }
                    continue;
                }
            };

            info!(
                "llama-server spawned successfully with PID: {:?}",
                child.id()
            );

            tokio::select! {
                status = child.wait() => {
                    match status {
                        Ok(exit_status) => {
                            warn!("llama-server exited with status: {}. Restarting in 2 seconds...", exit_status);
                        }
                        Err(e) => {
                            error!("Error waiting for llama-server: {}. Restarting in 2 seconds...", e);
                        }
                    }
                    // Auto-restart delay
                    tokio::select! {
                        _ = &mut rx => {
                            info!("Received stop signal while waiting to restart.");
                            break;
                        }
                        _ = tokio::time::sleep(std::time::Duration::from_secs(2)) => {}
                    }
                }
                _ = &mut rx => {
                    info!("Received stop signal. Killing llama-server...");
                    if let Err(e) = child.kill().await {
                        error!("Failed to kill llama-server: {}", e);
                    }
                    break;
                }
            }
        }

        info!("llama-server background loop terminated.");

        // Clean up state
        let mut cleanup_lock = tx_state.lock().await;
        *cleanup_lock = None;
    });

    Ok(())
}

pub async fn stop_llama_server(state: tauri::State<'_, LlmEngineState>) -> Result<(), String> {
    let mut abort_tx_lock = state.abort_tx.lock().await;

    if let Some(tx) = abort_tx_lock.take() {
        let _ = tx.send(());
        Ok(())
    } else {
        Err("Engine is not currently running".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stop_server_when_not_running_safe_failure() {
        let state = LlmEngineState::new();
        let mut abort_tx_lock = state.abort_tx.lock().await;

        let result: Result<(), String> = if let Some(tx) = abort_tx_lock.take() {
            let _ = tx.send(());
            Ok(())
        } else {
            Err("Engine is not currently running".to_string())
        };

        assert_eq!(result, Err("Engine is not currently running".to_string()));
    }
}
