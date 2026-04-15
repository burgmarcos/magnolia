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

            let mut embeddings = Vec::with_capacity(chunks.len());
            for (idx, chunk) in chunks.iter().enumerate() {
                // Get vector from local API
                if let Ok(emb) = fetch_embedding(chunk).await {
                    // sqlite-vec directly accepts a JSON string format containing floats `[0.1, 0.2, ...]`!
                    let emb_json = serde_json::to_string(&emb).map_err(|e| e.to_string())?;
                    embeddings.push((idx as u32, emb_json));
                }
            }

            if !embeddings.is_empty() {
                let tx = conn.transaction().map_err(|e| e.to_string())?;
                {
                    let mut stmt_nodes = tx
                        .prepare("INSERT INTO nodes (document_id, chunk_index, content) VALUES (?1, ?2, ?3)")
                        .map_err(|e| e.to_string())?;
                    let mut stmt_vec = tx
                        .prepare("INSERT INTO vec_nodes(rowid, embedding) VALUES (?1, ?2)")
                        .map_err(|e| e.to_string())?;

                    for (idx, emb_json) in &embeddings {
                        let chunk = chunks[*idx as usize];
                        stmt_nodes
                            .execute(params![doc_id, idx, chunk])
                            .map_err(|e| e.to_string())?;

                        let new_rowid = tx.last_insert_rowid();

                        stmt_vec
                            .execute(params![new_rowid, emb_json])
                            .map_err(|e| e.to_string())?;

                        total_chunks_embedded += 1;
                    }
                }
                tx.commit().map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(total_chunks_embedded)
}

pub fn delete_document_from_index(conn: &mut Connection, doc_id: &str) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Delete associated edges
    tx.execute(
        "DELETE FROM edges WHERE source_node_id IN (SELECT rowid FROM nodes WHERE document_id = ?1)
         OR target_node_id IN (SELECT rowid FROM nodes WHERE document_id = ?1)",
        params![doc_id],
    )
    .map_err(|e| e.to_string())?;

    // 2. Delete from vec_nodes (virtual table)
    tx.execute(
        "DELETE FROM vec_nodes WHERE rowid IN (SELECT rowid FROM nodes WHERE document_id = ?1)",
        params![doc_id],
    )
    .map_err(|e| e.to_string())?;

    // 3. Delete from nodes
    tx.execute("DELETE FROM nodes WHERE document_id = ?1", params![doc_id])
        .map_err(|e| e.to_string())?;

    // 4. Delete from documents
    tx.execute("DELETE FROM documents WHERE id = ?1", params![doc_id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct IndexedDocument {
    pub id: String,
    pub filename: String,
    pub path: String,
}

pub fn get_indexed_documents(conn: &Connection) -> Result<Vec<IndexedDocument>, String> {
    let mut stmt = conn
        .prepare("SELECT id, filename, path FROM documents")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(IndexedDocument {
                id: row.get(0)?,
                filename: row.get(1)?,
                path: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut docs = Vec::new();
    for row in rows.filter_map(|r| r.ok()) {
        docs.push(row);
    }
    Ok(docs)
}

#[derive(Serialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub type_name: String, // 'document' | 'chunk'
    pub details: String,
}

#[derive(Serialize)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub relationship: String,
}

#[derive(Serialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

pub fn get_graph_data(conn: &Connection) -> Result<GraphData, String> {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // 1. Fetch Documents as Root Nodes
    let mut doc_stmt = conn
        .prepare("SELECT id, filename FROM documents")
        .map_err(|e| e.to_string())?;
    let doc_rows = doc_stmt
        .query_map([], |row| {
            Ok(GraphNode {
                id: row.get(0)?,
                label: row.get(1)?,
                type_name: "document".to_string(),
                details: "Source File".to_string(),
            })
        })
        .map_err(|e| e.to_string())?;

    for node in doc_rows.filter_map(|r| r.ok()) {
        nodes.push(node);
    }

    // 2. Fetch Chunks as Leaf Nodes
    let mut chunk_stmt = conn
        .prepare("SELECT rowid, document_id, chunk_index, SUBSTR(content, 0, 40) FROM nodes")
        .map_err(|e| e.to_string())?;
    let chunk_rows = chunk_stmt
        .query_map([], |row| {
            let rowid: i64 = row.get(0)?;
            let doc_id: String = row.get(1)?;
            let chunk_idx: u32 = row.get(2)?;
            let snippet: String = row.get(3)?;

            Ok((rowid, doc_id, chunk_idx, snippet))
        })
        .map_err(|e| e.to_string())?;

    for chunk in chunk_rows.filter_map(|r| r.ok()) {
        let (rowid, doc_id, chunk_idx, snippet) = chunk;
        let node_id = format!("chunk-{}", rowid);

        nodes.push(GraphNode {
            id: node_id.clone(),
            label: format!("Chunk #{}", chunk_idx),
            type_name: "chunk".to_string(),
            details: format!("{}...", snippet),
        });

        // Add Edge from Document to its Chunks
        edges.push(GraphEdge {
            id: format!("e-doc-{}-{}", doc_id, rowid),
            source: doc_id,
            target: node_id,
            relationship: "contains".to_string(),
        });
    }

    // 3. Fetch Explicit Semantic Edges
    let mut edge_stmt = conn
        .prepare("SELECT id, source_node_id, target_node_id, relationship_type FROM edges")
        .map_err(|e| e.to_string())?;
    let edge_rows = edge_stmt
        .query_map([], |row| {
            Ok(GraphEdge {
                id: row.get(0)?,
                source: format!("chunk-{}", row.get::<_, i64>(1)?),
                target: format!("chunk-{}", row.get::<_, i64>(2)?),
                relationship: row.get(3).unwrap_or("related".to_string()),
            })
        })
        .map_err(|e| e.to_string())?;

    for edge in edge_rows.filter_map(|r| r.ok()) {
        edges.push(edge);
    }

    Ok(GraphData { nodes, edges })
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

#[cfg(test)]
mod sql_tests {
    use super::*;
    use rusqlite::Connection;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use tokio::sync::oneshot;

    fn temp_doc_path(prefix: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("{}_{}_{}.txt", prefix, std::process::id(), nanos))
    }

    async fn start_mock_embedding_server() -> (oneshot::Sender<()>, tokio::task::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:8081").await.unwrap();
        let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

        let handle = tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = &mut shutdown_rx => {
                        break;
                    }
                    accepted = listener.accept() => {
                        let (mut socket, _) = accepted.unwrap();
                        let mut req = vec![0u8; 4096];
                        let read = socket.read(&mut req).await.unwrap_or(0);
                        if read == 0 {
                            continue;
                        }

                        let request = String::from_utf8_lossy(&req[..read]);
                        let embedding = if request.contains("sync-one") || request.contains("atomic-one") {
                            "[0.11]"
                        } else if request.contains("sync-two") || request.contains("atomic-two") {
                            "[0.22]"
                        } else {
                            "[0.33]"
                        };
                        let body = format!(r#"{{"data":[{{"embedding":{embedding}}}]}}"#);
                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = socket.write_all(response.as_bytes()).await;
                    }
                }
            }
        });

        (shutdown_tx, handle)
    }

    #[tokio::test]
    async fn test_generate_document_embeddings_rowid_sync_and_atomicity() {
        let (shutdown_tx, server_handle) = start_mock_embedding_server().await;

        // Scenario 1: successful inserts keep nodes and vec_nodes rowids in sync.
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE documents (id TEXT PRIMARY KEY, path TEXT, filename TEXT)",
            [],
        )
        .unwrap();
        conn.execute("CREATE TABLE nodes (rowid INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT, chunk_index INTEGER, content TEXT)", []).unwrap();
        conn.execute(
            "CREATE TABLE vec_nodes (rowid INTEGER PRIMARY KEY, embedding TEXT)",
            [],
        )
        .unwrap();

        let success_path = temp_doc_path("rag_sync");
        fs::write(&success_path, "sync-one\n\nsync-two").unwrap();
        conn.execute(
            "INSERT INTO documents (id, path, filename) VALUES (?1, ?2, ?3)",
            params!["doc_sync", success_path.to_string_lossy(), "rag_sync.txt"],
        )
        .unwrap();

        let inserted = generate_document_embeddings(&mut conn).await.unwrap();
        assert_eq!(inserted, 2);

        let nodes_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
            .unwrap();
        let vec_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM vec_nodes", [], |row| row.get(0))
            .unwrap();
        assert_eq!(nodes_count, 2);
        assert_eq!(vec_count, 2);

        let nodes_without_vec: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM nodes n LEFT JOIN vec_nodes v ON n.rowid = v.rowid WHERE v.rowid IS NULL",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let vec_without_nodes: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM vec_nodes v LEFT JOIN nodes n ON v.rowid = n.rowid WHERE n.rowid IS NULL",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(nodes_without_vec, 0);
        assert_eq!(vec_without_nodes, 0);

        // Scenario 2: insertion error rolls back both tables atomically.
        let mut atomic_conn = Connection::open_in_memory().unwrap();
        atomic_conn
            .execute(
                "CREATE TABLE documents (id TEXT PRIMARY KEY, path TEXT, filename TEXT)",
                [],
            )
            .unwrap();
        atomic_conn.execute("CREATE TABLE nodes (rowid INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT, chunk_index INTEGER, content TEXT)", []).unwrap();
        atomic_conn
            .execute(
                "CREATE TABLE vec_nodes (rowid INTEGER PRIMARY KEY, embedding TEXT CHECK(embedding != '[0.22]'))",
                [],
            )
            .unwrap();

        let atomic_path = temp_doc_path("rag_atomic");
        fs::write(&atomic_path, "atomic-one\n\natomic-two").unwrap();
        atomic_conn
            .execute(
                "INSERT INTO documents (id, path, filename) VALUES (?1, ?2, ?3)",
                params![
                    "doc_atomic",
                    atomic_path.to_string_lossy(),
                    "rag_atomic.txt"
                ],
            )
            .unwrap();

        let result = generate_document_embeddings(&mut atomic_conn).await;
        assert!(result.is_err());

        let atomic_nodes_count: i64 = atomic_conn
            .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
            .unwrap();
        let atomic_vec_count: i64 = atomic_conn
            .query_row("SELECT COUNT(*) FROM vec_nodes", [], |row| row.get(0))
            .unwrap();
        assert_eq!(atomic_nodes_count, 0);
        assert_eq!(atomic_vec_count, 0);

        let _ = fs::remove_file(success_path);
        let _ = fs::remove_file(atomic_path);
        let _ = shutdown_tx.send(());
        let _ = server_handle.await;
    }
}
