use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(Serialize, Deserialize, Debug)]
pub struct SessionStore {
    pub windows: serde_json::Value,
    pub configs: serde_json::Value,
}

fn get_session_path(user_id: &str) -> PathBuf {
    let path = PathBuf::from(format!("/data/sessions/{}", user_id));
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.join("active_session.json")
}

#[command]
pub async fn save_session(user_id: String, state: SessionStore) -> Result<(), String> {
    let path = get_session_path(&user_id);
    let data = serde_json::to_string_pretty(&state)
        .map_err(|e| e.to_string())?;
    
    fs::write(path, data)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn load_session(user_id: String) -> Result<Option<SessionStore>, String> {
    let path = get_session_path(&user_id);
    if !path.exists() {
        return Ok(None);
    }

    let data = fs::read_to_string(path)
        .map_err(|e| e.to_string())?;
    
    let state: SessionStore = serde_json::from_str(&data)
        .map_err(|e| e.to_string())?;
        
    Ok(Some(state))
}

#[command]
pub async fn clear_session(user_id: String) -> Result<(), String> {
    let path = get_session_path(&user_id);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
