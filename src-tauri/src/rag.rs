use reqwest::Client;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize)]
struct EmbeddingRequest {
    input: String,
    model: String,
}

#[derive(Deserialize)]
struct EmbeddingResponseData {
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingResponseData>,
}

pub async fn fetch_embedding(input: &str) -> Result<Vec<f32>, String> {
    let client = Client::new();
    let body = EmbeddingRequest {
        input: input.to_string(),
        model: "all-MiniLM-L6-v2.gguf".to_string(),
    };

    // Default endpoint assuming llama-server is running on 8081 with --embedding flag
    let res = client
        .post("http://127.0.0.1:8081/v1/embeddings")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch embedding: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Embedding server returned: {}", res.status()));
    }

    let mut json: EmbeddingResponse = res
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    if json.data.is_empty() {
        return Err("No embeddings returned".to_string());
    }

    Ok(json.data.remove(0).embedding)
}

pub async fn generate_document_embeddings(conn: &mut Connection) -> Result<usize, String> {
    // 1. Fetch unindexed documents (e.g., those not in `nodes`)
    // Normally, tracking a status flag on documents is better, but here we'll just check what isn't in nodes.

    // Simple basic string-split chunking by double linebreaks for now
    let mut doc_mappings: Vec<(String, String)> = Vec::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT id, path FROM documents WHERE id NOT IN (SELECT document_id FROM nodes)",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?;

        for row in rows.filter_map(|r| r.ok()) {
            doc_mappings.push(row);
        }
    }

    let mut total_chunks_embedded = 0;

    for (doc_id, path) in doc_mappings {
        if let Ok(content) = fs::read_to_string(&path) {
            let chunks: Vec<&str> = content
                .split("\n\n")
                .filter(|s| !s.trim().is_empty())
                .collect();

            for (idx, chunk) in chunks.iter().enumerate() {
                // Get vector from local API
                if let Ok(emb) = fetch_embedding(chunk).await {
                    let tx = conn.transaction().map_err(|e| e.to_string())?;

                    // sqlite-vec directly accepts a JSON string format containing floats `[0.1, 0.2, ...]`!
                    let emb_json = serde_json::to_string(&emb).map_err(|e| e.to_string())?;

                    // Insert to physical table
                    tx.execute(
                        "INSERT INTO nodes (document_id, chunk_index, content) VALUES (?1, ?2, ?3)",
                        params![doc_id, idx as u32, chunk],
                    )
                    .map_err(|e| e.to_string())?;

                    let new_rowid = tx.last_insert_rowid();

                    // Insert to virtual sqlite-vec table binding rowid
                    tx.execute(
                        "INSERT INTO vec_nodes(rowid, embedding) VALUES (?1, ?2)",
                        params![new_rowid, emb_json],
                    )
                    .map_err(|e| e.to_string())?;

                    tx.commit().map_err(|e| e.to_string())?;
                    total_chunks_embedded += 1;
                }
            }
        }
    }

    Ok(total_chunks_embedded)
}

#[derive(Serialize)]
pub struct SearchResult {
    pub document_id: String,
    pub content: String,
    pub distance: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_embedding_graceful_failure() {
        // This validates that hitting an embedding endpoint fails safely as a Result::Err
        // instead of panicking or crashing the host process if the server is offline.
        let result = fetch_embedding("Test semantic chunk").await;

        // It either successfully fetches, or returns a safe error string. It does NOT panic.
        match result {
            Ok(emb) => assert!(!emb.is_empty()),
            Err(e) => assert!(e.contains("Failed to fetch embedding") || e.contains("timeout")),
        }
    }
}
