use rusqlite::{params, Connection, Result};
use serde::Serialize;
use std::path::Path;
use tauri::command;
use walkdir::WalkDir;

#[derive(Serialize)]
pub struct SearchResult {
    pub name: String,
    pub path: String,
    pub file_type: String,
}

pub fn initialize_search_db(data_dir: &Path) -> Result<Connection> {
    let db_path = data_dir.join("search_index.db");
    let conn = Connection::open(db_path)?;

    // Create FTS5 virtual table for lightning fast searching
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS file_index USING fts5(
            name, 
            path, 
            type,
            content UNINDEXED
        )",
        [],
    )?;

    Ok(conn)
}

#[command]
pub async fn rebuild_index(user_id: String) -> Result<(), String> {
    let data_path = format!("/data/users/{}", user_id);
    let db_path = format!("/data/system/search_{}.db", user_id);

    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Clear existing index
    conn.execute("DELETE FROM file_index", [])
        .map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    {
        let mut stmt = tx
            .prepare_cached("INSERT INTO file_index (name, path, type) VALUES (?, ?, ?)")
            .map_err(|e| e.to_string())?;
        for entry in WalkDir::new(data_path).into_iter() {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path().to_string_lossy().to_string();
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().is_dir();
            let file_type = if is_dir { "folder" } else { "file" };

            stmt.execute(params![name, path, file_type])
                .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn search_mempalace(user_id: String, query: String) -> Result<Vec<SearchResult>, String> {
    let db_path = format!("/data/system/search_{}.db", user_id);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT name, path, type FROM file_index WHERE file_index MATCH ? ORDER BY rank LIMIT 50")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![query], |row| {
            Ok(SearchResult {
                name: row.get(0)?,
                path: row.get(1)?,
                file_type: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }

    Ok(results)
}
