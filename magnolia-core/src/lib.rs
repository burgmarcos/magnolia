pub mod database;
mod downloader;
mod huggingface;
pub mod indexer;
mod inference;
mod llm_manager;
pub mod rag;
mod secrets;
mod telemetry;
mod installer;
mod app_manager;
pub mod system;
pub mod ai;

pub fn run_headless() {
    println!("[Magnolia] Headless mode: Starting background systems...");
    
    // Spawn heartbeats without Tauri context
    system::storage::spawn_storage_pulse();
    system::network::spawn_network_lattice();
    system::hal::spawn_hal_maintenance();

    println!("[Magnolia] Headless backend is active. Keeping main thread alive...");
    
    // Keep the main thread alive since we don't have the Tauri loop
    loop {
        std::thread::sleep(std::time::Duration::from_secs(3600));
    }
}

use system::sync::SyncWatcher;

pub struct DbState {
    pub conn: tokio::sync::Mutex<Option<rusqlite::Connection>>,
}

#[tauri::command]
fn get_launch_mode() -> String {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|arg| arg == "--uninstall") {
        return "uninstaller".to_string();
    }
    
    // If not running from the install directory, we assume it's the bootstrapper/installer
    if !installer::is_installed() {
        return "installer".to_string();
    }
    
    "main".to_string()
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
async fn get_hardware_specs(app: tauri::AppHandle) -> Result<telemetry::HardwareSpecs, String> {
    // Run the heavy sysinfo work in a blocking thread to avoid freezing the main loop
    tokio::task::spawn_blocking(move || {
        let mut specs = telemetry::get_system_specs();
        specs.screen_resolution = telemetry::get_screen_resolution(&app);
        specs
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn refresh_hardware_specs(app: tauri::AppHandle) -> Result<telemetry::HardwareSpecs, String> {
    get_hardware_specs(app).await
}

#[tauri::command]
async fn verify_hf_token(token: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client.get("https://huggingface.co/api/whoami-v2")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if res.status().is_success() {
        Ok("Token Validated".into())
    } else {
        Err(format!("HuggingFace rejected token: {}", res.status()))
    }
}

#[tauri::command]
async fn search_hf_models(model_id: String) -> Result<huggingface::HfModelInfo, String> {
    // Explicitly query the keyring for the HuggingFace token
    let token = secrets::get_api_key("huggingface").map_err(|e| {
        println!("Keyring access warning: {}", e);
        "HF API Key not found. Please set it in Models Hub.".to_string()
    })?;
    
    huggingface::fetch_hf_model_size(&model_id, Some(token)).await
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
async fn get_indexed_documents(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<rag::IndexedDocument>, String> {
    let db_state = state.conn.lock().await;
    if let Some(ref conn) = *db_state {
        rag::get_indexed_documents(conn)
    } else {
        Err("Database not initialized".into())
    }
}

#[tauri::command]
async fn delete_knowledge_document(
    state: tauri::State<'_, DbState>,
    doc_id: String,
) -> Result<(), String> {
    let mut db_state = state.conn.lock().await;
    if let Some(ref mut conn) = *db_state {
        rag::delete_document_from_index(conn, &doc_id)
    } else {
        Err("Database not initialized".into())
    }
}

#[derive(serde::Serialize)]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = std::fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for entry in entries.filter_map(|e| e.ok()) {
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        list.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
        });
    }
    // Sort directories first
    list.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(list)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    opener::open(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    opener::open(url).map_err(|e| e.to_string())
}

use tauri::Manager;

#[tauri::command]
async fn spawn_browser_view(
    _app: tauri::AppHandle,
    label: String,
    url: String,
    _x: f64,
    _y: f64,
    _width: f64,
    _height: f64,
) -> Result<(), String> {
    // In Magnolia Phase 3, we spawn a truly isolated Bubblewrap container
    // for the browser engine. The previous Tauri-native webview is 
    // replaced with a sandboxed WPE-WebKit kiosk for maximum sovereignty.
    
    let sandbox = system::sandbox::SovereignSandbox::new(&label, &url);
    sandbox.spawn_browser()?;
        
    Ok(())
}

#[tauri::command]
async fn sync_browser_view(
    app: tauri::AppHandle,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(view) = app.get_webview_window(&label) {
        view.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: x as i32, y: y as i32 }))
            .map_err(|e| e.to_string())?;
        view.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: width as u32, height: height as u32 }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn detach_browser_view(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(view) = app.get_webview_window(&label) {
        view.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}


#[tauri::command]
async fn ensure_default_knowledge_dir() -> Result<String, String> {
    if let Some(mut docs_dir) = dirs::document_dir() {
        docs_dir.push("Magnolia_Knowledge");
        if !docs_dir.exists() {
            std::fs::create_dir_all(&docs_dir).map_err(|e| e.to_string())?;
            // Create a welcome markdown file
            let welcome_file = docs_dir.join("Welcome.md");
            let _ = std::fs::write(&welcome_file, "# Welcome to Magnolia Knowledge\n\nDrop your Markdown files here to give the AI context.");
        }
        Ok(docs_dir.to_string_lossy().to_string())
    } else {
        Err("Could not find user Documents directory".into())
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

#[tauri::command]
async fn get_graph_data(state: tauri::State<'_, DbState>) -> Result<rag::GraphData, String> {
    let db_state = state.conn.lock().await;
    if let Some(ref conn) = *db_state {
        rag::get_graph_data(conn)
    } else {
        Err("Database not initialized".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // We are in App Mode.
    // Proceed with the current tauri application logic.
    tauri::Builder::default()
        .manage(llm_manager::LlmEngineState::new())
        .manage(DbState {
            conn: tokio::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_launch_mode,
            installer::perform_installation,
            installer::perform_uninstallation,
            get_app_status,
            set_api_key,
            get_api_key,
            verify_hf_token,
            download_model_file,
            get_hardware_specs,
            refresh_hardware_specs,
            search_hf_models,
            assess_model_fit,
            start_local_engine,
            stop_local_engine,
            get_local_models,
            stream_chat_local,
            stream_chat_cloud,
            index_local_folder,
            trigger_embedding_job,
            delete_knowledge_document,
            get_indexed_documents,
            semantic_search,
            ensure_default_knowledge_dir,
            get_graph_data,
            list_directory,
            read_text_file,
            write_text_file,
            open_file,
            open_external_url,
            rename_file,
            delete_file,
            spawn_browser_view,
            sync_browser_view,
            detach_browser_view,
            system::api::get_rauc_status,
            system::api::rauc_install,
            system::api::mark_partition_status,
            system::api::get_network_settings,
            system::api::set_power_state,
            system::api::unlock_partition,
            system::api::get_sync_quota,
            system::api::generate_recovery_key,
            system::api::check_identity_exists,
            system::api::commit_identity,
            system::api::get_system_update_status,
            system::api::get_security_status,
            system::api::detect_gpu,
            app_manager::download_app,
            app_manager::launch_app,
            system::hal::set_system_volume,
            system::hal::set_system_brightness,
            system::hal::set_hardware_killswitch,
            system::hal::set_power_saving_mode,
            system::network::scan_wifi,
            system::network::scan_bluetooth,
            system::storage::archive_app,
            system::storage::move_to_trash,
            system::storage::empty_trash,
            system::media::take_screenshot,
            system::lifestyle::log_usage_event,
            system::lifestyle::get_lifestyle_stats,
            system::hal::suggest_performance_mode,
            system::privacy::get_hardware_telemetry,
            system::session::save_session,
            system::session::load_session,
            system::session::clear_session,
            system::search::rebuild_index,
            system::search::search_mempalace,
            system::audit::log_permission_event,
            system::audit::get_permission_history,
            system::storage::get_disk_info,
            system::storage::manage_partition,
            system::storage::verify_security_action,
            system::storage::request_boot_resize,
            system::p2p_updates::discover_update_peers,
            system::p2p_updates::sync_package_from_peer,
            system::p2p_updates::toggle_p2p_sharing,
            system::p2p_updates::authenticate_peer
        ])
        .setup(|app| {
            use tauri::Manager;
            println!("[Magnolia] Starting Dashboard Hub setup...");

            // Initialize Database on startup
            match app.path().app_data_dir() {
                Ok(app_data_dir) => {
                    println!("[Magnolia] AppData directory located: {:?}", app_data_dir);
                    if !app_data_dir.exists() {
                        let _ = std::fs::create_dir_all(&app_data_dir);
                    }
                    let state = app.state::<DbState>();
                    match database::initialize_database(&app_data_dir) {
                        Ok(conn) => {
                            if let Ok(mut db_state) = state.conn.try_lock() {
                                *db_state = Some(conn);
                                println!("[Magnolia] Database initialized successfully.");
                            }
                        }
                        Err(e) => {
                            eprintln!("[Magnolia ERROR] Database initialization failed: {}", e);
                            // We don't exit here to allow the UI to show a connection error later
                        }
                    }
                }
                Err(e) => eprintln!("[Magnolia ERROR] Could not determine AppData directory: {}", e),
            }

            println!("[Magnolia] Initializing Tauri plugins...");
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            app.handle().plugin(tauri_plugin_dialog::init())
                .map_err(|e| { eprintln!("[Magnolia ERROR] Dialog plugin fail: {}", e); e })?;
            app.handle().plugin(tauri_plugin_fs::init())
                .map_err(|e| { eprintln!("[Magnolia ERROR] FS plugin fail: {}", e); e })?;
            app.handle().plugin(tauri_plugin_process::init())
                .map_err(|e| { eprintln!("[Magnolia ERROR] Process plugin fail: {}", e); e })?;

            // 3. Start Sovereign Sync Watchdog for AppData
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                println!("[Magnolia] Starting Sync Watcher...");
                let _ = SyncWatcher::start(app_data_dir);
            }

            // 4. Start Autonomous System Heartbeats (Steel Integrity)
            println!("[Magnolia] Spawning systems pulses...");
            system::storage::spawn_storage_pulse();
            system::network::spawn_network_lattice();
            system::hal::spawn_hal_maintenance();

            println!("[Magnolia] Dashboard Hub setup complete.");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
