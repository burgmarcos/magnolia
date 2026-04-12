use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use tauri::command;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuditEntry {
    pub timestamp: DateTime<Utc>,
    pub app_id: String,
    pub permission: String,
    pub status: String, // "Allowed", "Denied", "Requested"
}

fn get_audit_path() -> PathBuf {
    let path = PathBuf::from("/data/system/privacy_audit.json");
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    path
}

#[command]
pub async fn log_permission_event(
    app_id: String,
    permission: String,
    status: String,
) -> Result<(), String> {
    let path = get_audit_path();
    let mut logs: Vec<AuditEntry> = if path.exists() {
        let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&data).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };

    logs.push(AuditEntry {
        timestamp: Utc::now(),
        app_id,
        permission,
        status,
    });

    // Keep only last 1000 entries to prevent file bloat in this version
    if logs.len() > 1000 {
        logs.drain(0..logs.len() - 1000);
    }

    let data = serde_json::to_string_pretty(&logs).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn get_permission_history() -> Result<Vec<AuditEntry>, String> {
    let path = get_audit_path();
    if !path.exists() {
        return Ok(Vec::new());
    }

    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let logs: Vec<AuditEntry> = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    // Return logs in reverse chronological order
    let mut reversed = logs;
    reversed.reverse();
    Ok(reversed)
}
