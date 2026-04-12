use crate::inference;
use crate::llm_manager;

#[tauri::command]
pub async fn start_local_engine(
    model_name: String,
    quant_type: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, llm_manager::LlmEngineState>,
) -> Result<(), String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let model_path = app_data_dir.join("models").join(&model_name);

    let path_str = model_path.to_string_lossy().to_string();
    llm_manager::start_llama_server_loop(app.clone(), path_str, quant_type, state).await
}

#[tauri::command]
pub async fn stop_local_engine(
    state: tauri::State<'_, llm_manager::LlmEngineState>,
) -> Result<(), String> {
    llm_manager::stop_llama_server(state).await
}

#[tauri::command]
pub async fn stream_chat_local(
    app: tauri::AppHandle,
    messages: Vec<inference::ChatMessage>,
) -> Result<(), String> {
    inference::stream_chat_local(app, messages).await
}

#[tauri::command]
pub async fn stream_chat_cloud(
    app: tauri::AppHandle,
    provider: String,
    model: String,
    messages: Vec<inference::ChatMessage>,
) -> Result<(), String> {
    inference::stream_chat_cloud(app, provider, model, messages).await
}
