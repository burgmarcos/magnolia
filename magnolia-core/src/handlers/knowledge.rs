use crate::indexer;
use crate::rag;
use crate::DbState;

#[tauri::command]
pub async fn index_local_folder(
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
pub async fn trigger_embedding_job(state: tauri::State<'_, DbState>) -> Result<usize, String> {
    let mut db_state = state.conn.lock().await;
    if let Some(ref mut conn) = *db_state {
        rag::generate_document_embeddings(conn).await
    } else {
        Err("Database not initialized".into())
    }
}

#[tauri::command]
pub async fn get_indexed_documents(
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
pub async fn delete_knowledge_document(
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

#[tauri::command]
pub async fn ensure_default_knowledge_dir() -> Result<String, String> {
    if let Some(mut docs_dir) = dirs::document_dir() {
        docs_dir.push("Magnolia_Knowledge");
        if !docs_dir.exists() {
            std::fs::create_dir_all(&docs_dir).map_err(|e| e.to_string())?;
            let welcome_file = docs_dir.join("Welcome.md");
            let _ = std::fs::write(
                &welcome_file,
                "# Welcome to Magnolia Knowledge\n\nDrop your Markdown files here to give the AI context.",
            );
        }
        Ok(docs_dir.to_string_lossy().to_string())
    } else {
        Err("Could not find user Documents directory".into())
    }
}

#[tauri::command]
pub async fn semantic_search(
    state: tauri::State<'_, DbState>,
    query: String,
    limit: usize,
) -> Result<Vec<rag::SearchResult>, String> {
    let query_emb = rag::fetch_embedding(&query).await?;
    let emb_json = serde_json::to_string(&query_emb).map_err(|e| e.to_string())?;

    let db_state = state.conn.lock().await;
    if let Some(ref conn) = *db_state {
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
pub async fn get_graph_data(state: tauri::State<'_, DbState>) -> Result<rag::GraphData, String> {
    let db_state = state.conn.lock().await;
    if let Some(ref conn) = *db_state {
        rag::get_graph_data(conn)
    } else {
        Err("Database not initialized".into())
    }
}
