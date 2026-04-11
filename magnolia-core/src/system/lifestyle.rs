use serde::{Serialize, Deserialize};
use tauri::command;
use chrono::{DateTime, Local};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UsageEvent {
    pub app_id: String,
    pub timestamp: DateTime<Local>,
    pub event_type: String, // "gain_focus" or "lose_focus"
}

#[derive(Serialize, Debug)]
pub struct AppUsageSummary {
    pub app_id: String,
    pub total_minutes: u64,
}

#[command]
pub async fn log_usage_event(app_id: String, event_type: String) -> Result<(), String> {
    let now = Local::now();
    println!("[LIFESTYLE] App '{}' triggered {}", app_id, event_type);
    
    let event = UsageEvent {
        app_id: app_id.clone(),
        timestamp: now,
        event_type: event_type.clone(),
    };

    let log_path = "/data/system/lifestyle_audit.json";
    let _ = fs::create_dir_all("/data/system");

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("Failed to open lifestyle audit: {}", e))?;

    let json = serde_json::to_string(&event).map_err(|e| e.to_string())?;
    writeln!(file, "{}", json).map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn get_lifestyle_stats() -> Result<Vec<AppUsageSummary>, String> {
    let log_path = "/data/system/lifestyle_audit.json";
    if !Path::new(log_path).exists() {
        return Ok(vec![]);
    }

    let contents = fs::read_to_string(log_path).map_err(|e| e.to_string())?;
    let mut usage_map: HashMap<String, u64> = HashMap::new();

    for line in contents.lines() {
        if let Ok(event) = serde_json::from_str::<UsageEvent>(line) {
            // Simplified: every focus event counts as 1 minute for this maturity level
            // In full production, we'd calculate diffs between Focus and LoseFocus
            *usage_map.entry(event.app_id).or_insert(0) += 1;
        }
    }

    let stats = usage_map.into_iter()
        .map(|(app_id, count)| AppUsageSummary { app_id, total_minutes: count })
        .collect();

    Ok(stats)
}
