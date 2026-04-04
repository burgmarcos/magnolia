pub mod database;
mod downloader;
mod huggingface;
pub mod indexer;
mod inference;
mod llm_manager;
pub mod rag;
mod secrets;
mod telemetry;

pub struct DbState {
    pub conn: tokio::sync::Mutex<Option<rusqlite::Connection>>,
}

#[tauri::command]
fn get_app_status() -> String {
    "System Online".into()
}

#[tauri::command]
fn set_api_key(service: String, key: String) -> Result<(), String> {
    secrets::set_api_key(&service, &key)
}

#[tauri::command]
fn get_api_key(service: String) -> Result<String, String> {
    secrets::get_api_key(&service)
}

#[tauri::command]
async fn download_model_file(
    app: tauri::AppHandle,
    url: String,
    filename: String,
) -> Result<(), String> {
    downloader::download_model(app, url, filename).await
}

#[tauri::command]
fn get_hardware_specs() -> telemetry::HardwareSpecs {
    telemetry::get_system_specs()
}

#[tauri::command]
async fn search_hf_models(model_id: String) -> Result<huggingface::HfModelInfo, String> {
    huggingface::fetch_hf_model_size(&model_id).await
}

#[tauri::command]
fn assess_model_fit(model_size_bytes: u64) -> String {
    let specs = telemetry::get_system_specs();
    let buffer: u64 = 2 * 1024 * 1024 * 1024; // 2GB buffer
    let required_memory = model_size_bytes + buffer;

    if specs.total_vram_bytes > 0 && required_memory <= specs.total_vram_bytes {
        return "Fits Perfectly".into();
    }

    if required_memory <= (specs.total_ram_bytes / 2) {
        // If it fits in half the system RAM, we assume it can be offloaded safely
        return "Needs Offload".into();
    } else if required_memory <= specs.total_ram_bytes {
        // It fits but consumes most of the system RAM
        return "Needs Offload".into();
    }

    "Does Not Run".into()
}

#[tauri::command]
async fn start_local_engine(
    model_name: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, llm_manager::LlmEngineState>,
) -> Result<(), String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let model_path = app_data_dir.join("models").join(&model_name);

    let path_str = model_path.to_string_lossy().to_string();
    llm_manager::start_llama_server_loop(path_str, state).await
}

#[tauri::command]
async fn stop_local_engine(
    state: tauri::State<'_, llm_manager::LlmEngineState>,
) -> Result<(), String> {
    llm_manager::stop_llama_server(state).await
}

#[tauri::command]
fn get_local_models(app: tauri::AppHandle) -> Result<Vec<String>, String> {
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
        // Create the directory if it doesn't exist to help the user know where to put models
        let _ = std::fs::create_dir_all(&models_dir);
    }

    Ok(models)
}

#[tauri::command]
async fn stream_chat_local(
    app: tauri::AppHandle,
    messages: Vec<inference::ChatMessage>,
) -> Result<(), String> {
    inference::stream_chat_local(app, messages).await
}

#[tauri::command]
async fn stream_chat_cloud(
    app: tauri::AppHandle,
    provider: String,
    model: String,
    messages: Vec<inference::ChatMessage>,
) -> Result<(), String> {
    inference::stream_chat_cloud(app, provider, model, messages).await
}

#[tauri::command]
async fn index_local_folder(
    state: tauri::State<'_, DbState>,
    path: String,
) -> Result<usize, String> {
    let mut db_state = state.conn.lock().await;
    if let Some(ref mut conn) = *db_state {
        indexer::index_directory(conn, &path)
    } else {
        Err("Database not initialized".into())
    }
}

#[tauri::command]
async fn trigger_embedding_job(state: tauri::State<'_, DbState>) -> Result<usize, String> {
    let mut db_state = state.conn.lock().await;
    if let Some(ref mut conn) = *db_state {
        rag::generate_document_embeddings(conn).await
    } else {
        Err("Database not initialized".into())
    }
}

#[tauri::command]
async fn semantic_search(
    state: tauri::State<'_, DbState>,
    query: String,
    limit: usize,
) -> Result<Vec<rag::SearchResult>, String> {
    let query_emb = rag::fetch_embedding(&query).await?;
    let emb_json = serde_json::to_string(&query_emb).map_err(|e| e.to_string())?;

    let db_state = state.conn.lock().await;
    if let Some(ref conn) = *db_state {
        // Run synchronous db logic here
        let mut stmt = conn
            .prepare(
                "
            SELECT n.document_id, n.content, v.distance 
            FROM vec_nodes v 
            JOIN nodes n ON n.rowid = v.rowid 
            WHERE v.embedding MATCH ?1 AND k = ?2 
            ORDER BY v.distance ASC
            ",
            )
            .map_err(|e| format!("Prepare error: {}", e))?;

        let rows = stmt
            .query_map(rusqlite::params![emb_json, limit as isize], |row| {
                Ok(rag::SearchResult {
                    document_id: row.get(0)?,
                    content: row.get(1)?,
                    distance: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows.filter_map(|r| r.ok()) {
            results.push(row);
        }

        Ok(results)
    } else {
        Err("Database not initialized".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(llm_manager::LlmEngineState::new())
        .manage(DbState {
            conn: tokio::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_app_status,
            set_api_key,
            get_api_key,
            download_model_file,
            get_hardware_specs,
            search_hf_models,
            assess_model_fit,
            start_local_engine,
            stop_local_engine,
            get_local_models,
            stream_chat_local,
            stream_chat_cloud,
            index_local_folder,
            trigger_embedding_job,
            semantic_search
        ])
        .setup(|app| {
            use tauri::Manager;

            // Initialize Database on startup
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                if !app_data_dir.exists() {
                    let _ = std::fs::create_dir_all(&app_data_dir);
                }
                let state = app.state::<DbState>();
                if let Ok(conn) = database::initialize_database(&app_data_dir) {
                    // We're inside a synchronous setup block, try_lock is appropriate
                    if let Ok(mut db_state) = state.conn.try_lock() {
                        *db_state = Some(conn);
                    }
                }
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
