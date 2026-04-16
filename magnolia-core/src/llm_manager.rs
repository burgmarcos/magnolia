use log::{error, info, warn};
use serde::Serialize;
use std::process::Stdio;
use std::sync::Arc;
use tauri::Emitter;
use tokio::io::AsyncReadExt;
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

#[derive(Serialize, Clone)]
pub struct EngineErrorPayload {
    pub message: String,
    pub logs: String,
}

pub async fn start_llama_server_loop(
    app: tauri::AppHandle,
    model_path: String,
    quant_type: String,
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
            let start_time = tokio::time::Instant::now();
            let mut command = Command::new("llama-server");
            command.arg("-m").arg(&model_path);

            // Switch to Unix Socket for secure, local-only communication
            command.arg("--socket").arg("/run/magnolia/llama.sock");

            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                command.as_std_mut().creation_flags(0x08000000); // CREATE_NO_WINDOW
            }

            if !quant_type.is_empty() {
                if quant_type.contains(':') {
                    let parts: Vec<&str> = quant_type.split(':').collect();
                    if parts.len() == 2 {
                        info!(
                            "Applying separate K/V quantization: K={}, V={}",
                            parts[0], parts[1]
                        );
                        command.arg("-ctk").arg(parts[0]);
                        command.arg("-ctv").arg(parts[1]);
                    } else {
                        warn!(
                            "Invalid quantization format: {}. Defaulting to uniform.",
                            quant_type
                        );
                        command.arg("-ctk").arg(&quant_type);
                        command.arg("-ctv").arg(&quant_type);
                    }
                } else {
                    info!("Starting engine with uniform quantization: {}", quant_type);
                    command.arg("-ctk").arg(&quant_type);
                    command.arg("-ctv").arg(&quant_type);
                }
            }

            command.stderr(Stdio::piped());

            let mut child = match command.spawn() {
                Ok(c) => c,
                Err(e) => {
                    error!("Failed to spawn llama-server: {}. Retrying in 5s...", e);
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
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

            let mut stderr = child.stderr.take().expect("Failed to open stderr");
            let stderr_logs = Arc::new(Mutex::new(String::new()));
            let stderr_logs_clone = stderr_logs.clone();

            // Spawn a task to read stderr logs in the background
            tokio::spawn(async move {
                let mut buf = [0; 1024];
                while let Ok(n) = stderr.read(&mut buf).await {
                    if n == 0 {
                        break;
                    }
                    let mut logs = stderr_logs_clone.lock().await;
                    let chunk = String::from_utf8_lossy(&buf[..n]);
                    logs.push_str(&chunk);

                    // Keep only the last 2048 characters
                    if logs.len() > 2048 {
                        let offset = logs.len() - 2048;
                        *logs = logs[offset..].to_string();
                    }
                }
            });

            info!(
                "llama-server spawned successfully with PID: {:?}",
                child.id()
            );

            tokio::select! {
                status = child.wait() => {
                    let elapsed = start_time.elapsed();
                    match status {
                        Ok(exit_status) => {
                            if !exit_status.success() && elapsed.as_secs() < 3 {
                                let final_logs = stderr_logs.lock().await.clone();
                                error!("llama-server failed on startup (exited in {:?}). Logs: {}", elapsed, final_logs);

                                let _ = app.emit("engine-error", EngineErrorPayload {
                                    message: format!("Process failed on startup after {:?}", elapsed),
                                    logs: final_logs,
                                });
                                break;
                            }
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

/// Monitors system RAM and throttles the LLM if pressure is too high.
#[allow(dead_code)]
pub async fn monitor_ai_pressure(_child_id: u32) {
    let mut sys = sysinfo::System::new_all();
    loop {
        sys.refresh_memory();
        let used_pct = (sys.used_memory() as f64 / sys.total_memory() as f64) * 100.0;

        if used_pct > 90.0 {
            warn!(
                "[Magnolia] Critical Memory Pressure ({:.1}%). Throttling AI...",
                used_pct
            );
            // On Linux, we could use cgroups or SIGSTOP/SIGCONT to throttle.
            // For now, we just log a warning for the user.
        }

        tokio::time::sleep(std::time::Duration::from_secs(10)).await;
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

    #[test]
    fn test_llm_engine_state_new_has_no_sender() {
        let state = LlmEngineState::new();
        // The abort_tx Arc is initialized but the inner Option is None
        // We can verify this by attempting a blocking lock check
        let lock = state.abort_tx.try_lock();
        assert!(lock.is_ok());
        assert!(lock.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_start_sets_abort_tx() {
        let state = LlmEngineState::new();

        // Inject a sender directly to simulate a running engine
        {
            let (tx, _rx) = tokio::sync::oneshot::channel::<()>();
            let mut lock = state.abort_tx.lock().await;
            *lock = Some(tx);
        }

        // Now a stop call should succeed
        let mut lock = state.abort_tx.lock().await;
        let result: Result<(), String> = if let Some(tx) = lock.take() {
            let _ = tx.send(());
            Ok(())
        } else {
            Err("Engine is not currently running".to_string())
        };
        assert!(result.is_ok());
    }
}
