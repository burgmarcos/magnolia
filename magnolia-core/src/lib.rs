mod app_manager;
pub mod database;
mod downloader;
mod handlers;
mod huggingface;
pub mod indexer;
mod inference;
mod installer;
mod llm_manager;
pub mod rag;
mod secrets;
pub mod system;
mod telemetry;

pub fn run_headless() {
    println!("[Magnolia] Headless mode: Starting background systems...");

    system::storage::spawn_storage_pulse();
    system::network::spawn_network_lattice();
    system::hal::spawn_hal_maintenance();

    println!("[Magnolia] Headless backend is active. Keeping main thread alive...");

    loop {
        std::thread::sleep(std::time::Duration::from_secs(3600));
    }
}

use system::sync::SyncWatcher;

pub struct DbState {
    pub conn: tokio::sync::Mutex<Option<rusqlite::Connection>>,
}

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(llm_manager::LlmEngineState::new())
        .manage(DbState {
            conn: tokio::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // App lifecycle
            handlers::app::get_launch_mode,
            handlers::app::get_app_status,
            handlers::app::get_hardware_specs,
            handlers::app::refresh_hardware_specs,
            // Installer
            installer::perform_installation,
            installer::perform_uninstallation,
            // Secrets & API keys
            handlers::secrets::set_api_key,
            handlers::secrets::get_api_key,
            handlers::secrets::verify_hf_token,
            // Model management
            handlers::models::download_model_file,
            handlers::models::search_hf_models,
            handlers::models::assess_model_fit,
            handlers::models::get_local_models,
            handlers::models::get_local_model_size_bytes,
            // LLM engine
            handlers::llm::start_local_engine,
            handlers::llm::stop_local_engine,
            handlers::llm::stream_chat_local,
            handlers::llm::stream_chat_cloud,
            // Knowledge & RAG
            handlers::knowledge::index_local_folder,
            handlers::knowledge::trigger_embedding_job,
            handlers::knowledge::delete_knowledge_document,
            handlers::knowledge::get_indexed_documents,
            handlers::knowledge::semantic_search,
            handlers::knowledge::ensure_default_knowledge_dir,
            handlers::knowledge::get_graph_data,
            // File operations
            handlers::files::list_directory,
            handlers::files::read_text_file,
            handlers::files::write_text_file,
            handlers::files::open_file,
            handlers::files::open_external_url,
            handlers::files::rename_file,
            handlers::files::delete_file,
            // Browser views
            handlers::browser::spawn_browser_view,
            handlers::browser::sync_browser_view,
            handlers::browser::detach_browser_view,
            // System APIs
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
            // App manager
            app_manager::download_app,
            app_manager::launch_app,
            // HAL
            system::hal::set_system_volume,
            system::hal::set_system_brightness,
            system::hal::set_hardware_killswitch,
            system::hal::set_power_saving_mode,
            system::hal::suggest_performance_mode,
            // Network
            system::network::scan_wifi,
            system::network::scan_bluetooth,
            // Storage
            system::storage::archive_app,
            system::storage::move_to_trash,
            system::storage::empty_trash,
            system::storage::get_disk_info,
            system::storage::manage_partition,
            system::storage::verify_security_action,
            system::storage::request_boot_resize,
            // Media
            system::media::take_screenshot,
            // Lifestyle
            system::lifestyle::log_usage_event,
            system::lifestyle::get_lifestyle_stats,
            // Privacy
            system::privacy::get_hardware_telemetry,
            // Session
            system::session::save_session,
            system::session::load_session,
            system::session::clear_session,
            // Search
            system::search::rebuild_index,
            system::search::search_mempalace,
            // Audit
            system::audit::log_permission_event,
            system::audit::get_permission_history,
            // P2P Updates
            system::p2p_updates::discover_update_peers,
            system::p2p_updates::sync_package_from_peer,
            system::p2p_updates::toggle_p2p_sharing,
            system::p2p_updates::authenticate_peer
        ])
        .setup(|app| {
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
                        }
                    }
                }
                Err(e) => eprintln!(
                    "[Magnolia ERROR] Could not determine AppData directory: {}",
                    e
                ),
            }

            println!("[Magnolia] Initializing Tauri plugins...");
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.handle()
                .plugin(tauri_plugin_dialog::init())
                .map_err(|e| {
                    eprintln!("[Magnolia ERROR] Dialog plugin fail: {}", e);
                    e
                })?;
            app.handle().plugin(tauri_plugin_fs::init()).map_err(|e| {
                eprintln!("[Magnolia ERROR] FS plugin fail: {}", e);
                e
            })?;
            app.handle()
                .plugin(tauri_plugin_process::init())
                .map_err(|e| {
                    eprintln!("[Magnolia ERROR] Process plugin fail: {}", e);
                    e
                })?;

            // Start Sovereign Sync Watchdog for AppData
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                println!("[Magnolia] Starting Sync Watcher...");
                let _ = SyncWatcher::start(app_data_dir);
            }

            // Start Autonomous System Heartbeats
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
