use reqwest::Client;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;

const DEFAULT_EMBEDDING_ENDPOINT: &str = "http://127.0.0.1:8081/v1/embeddings";

#[cfg(test)]
static TEST_EMBEDDING_ENDPOINT: std::sync::OnceLock<std::sync::RwLock<Option<String>>> =
    std::sync::OnceLock::new();

fn embedding_endpoint() -> String {
    #[cfg(test)]
    if let Some(lock) = TEST_EMBEDDING_ENDPOINT.get() {
        if let Some(url) = lock
            .read()
            .expect("test embedding endpoint lock poisoned")
            .clone()
        {
            return url;
        }
    }

    std::env::var("MAGNOLIA_EMBEDDING_ENDPOINT")
        .unwrap_or_else(|_| DEFAULT_EMBEDDING_ENDPOINT.to_string())
}

#[cfg(test)]
fn set_test_embedding_endpoint(url: Option<String>) {
    let lock = TEST_EMBEDDING_ENDPOINT.get_or_init(|| std::sync::RwLock::new(None));
    *lock.write().expect("test embedding endpoint lock poisoned") = url;
}

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

    let res = client
        .post(embedding_endpoint())
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
                    embeddings.push((idx as u32, *chunk, emb_json));
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

                    for (idx, chunk, emb_json) in &embeddings {
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
    use rusqlite::ffi::sqlite3_auto_extension;
    use rusqlite::Connection;
    use rusqlite::OptionalExtension;
    use std::path::PathBuf;
    use std::sync::{Mutex, Once, OnceLock};
    use std::time::{SystemTime, UNIX_EPOCH};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    static VEC_EXTENSION_INIT: Once = Once::new();
    static SQL_TEST_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    struct TempFileGuard {
        path: PathBuf,
    }

    impl TempFileGuard {
        fn create_with_content(content: &str) -> Self {
            let file_name = format!(
                "magnolia-rag-test-{}-{}.txt",
                std::process::id(),
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .expect("clock moved backwards")
                    .as_nanos()
            );
            let path = std::env::temp_dir().join(file_name);
            fs::write(&path, content).expect("failed to write temp test document");
            Self { path }
        }

        fn as_str(&self) -> &str {
            self.path
                .to_str()
                .expect("temp path should be valid UTF-8 in test")
        }
    }

    impl Drop for TempFileGuard {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.path);
        }
    }

    struct TestEndpointGuard;

    impl TestEndpointGuard {
        fn set(url: String) -> Self {
            set_test_embedding_endpoint(Some(url));
            Self
        }
    }

    impl Drop for TestEndpointGuard {
        fn drop(&mut self) {
            set_test_embedding_endpoint(None);
        }
    }

    fn register_vec_extension() {
        VEC_EXTENSION_INIT.call_once(|| {
            #[allow(clippy::missing_transmute_annotations)]
            unsafe {
                sqlite3_auto_extension(Some(std::mem::transmute(
                    sqlite_vec::sqlite3_vec_init as *const (),
                )));
            }
        });
    }

    fn init_vec_schema(conn: &Connection) {
        conn.execute_batch(
            "
            CREATE TABLE documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                path TEXT UNIQUE NOT NULL,
                file_hash TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE nodes (
                rowid INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                FOREIGN KEY(document_id) REFERENCES documents(id)
            );

            CREATE VIRTUAL TABLE vec_nodes USING vec0(
                embedding float[384]
            );
            ",
        )
        .expect("failed to create in-memory schema");
    }

    async fn spawn_mock_embedding_server(
        embedding_lengths: Vec<usize>,
    ) -> (String, tokio::task::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("failed to bind mock embedding server");
        let addr = listener.local_addr().expect("failed to read local addr");

        let handle = tokio::spawn(async move {
            for embedding_len in embedding_lengths {
                let (mut stream, _) = listener.accept().await.expect("accept failed");
                let mut buffer = [0u8; 4096];
                let _bytes_read = stream
                    .read(&mut buffer)
                    .await
                    .expect("failed to read mock request");

                let embedding = vec![0.5_f32; embedding_len];
                let body = serde_json::json!({ "data": [{ "embedding": embedding }] }).to_string();
                let response = format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                stream
                    .write_all(response.as_bytes())
                    .await
                    .expect("failed to write mock response");
            }
        });

        (format!("http://{addr}/v1/embeddings"), handle)
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_generate_document_embeddings_sync() {
        let lock = SQL_TEST_LOCK.get_or_init(|| Mutex::new(()));
        let _guard = lock.lock().expect("sql test lock poisoned");
        register_vec_extension();
        let mut conn = Connection::open_in_memory().unwrap();
        init_vec_schema(&conn);

        let doc_id = "test_doc_1";
        let test_file = TempFileGuard::create_with_content("chunk 1\n\nchunk 2\n\nchunk 3");
        let (endpoint, server) = spawn_mock_embedding_server(vec![384, 384, 384]).await;
        let _endpoint_guard = TestEndpointGuard::set(endpoint);

        conn.execute(
            "INSERT INTO documents (id, filename, path, file_hash) VALUES (?1, ?2, ?3, ?4)",
            params![doc_id, "test_doc_1.txt", test_file.as_str(), "test-hash-1"],
        )
        .unwrap();

        let inserted = generate_document_embeddings(&mut conn)
            .await
            .expect("embedding generation should succeed");
        assert_eq!(inserted, 3);

        let node_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM nodes WHERE document_id = ?1",
                params![doc_id],
                |row| row.get(0),
            )
            .unwrap();
        let vec_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM vec_nodes", [], |row| row.get(0))
            .unwrap();
        let join_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM vec_nodes v JOIN nodes n ON n.rowid = v.rowid WHERE n.document_id = ?1",
                params![doc_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(node_count, 3);
        assert_eq!(vec_count, 3);
        assert_eq!(join_count, 3);

        server.await.expect("mock server task should complete");
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_generate_document_embeddings_atomic_rollback_on_vec_insert_error() {
        let lock = SQL_TEST_LOCK.get_or_init(|| Mutex::new(()));
        let _guard = lock.lock().expect("sql test lock poisoned");
        register_vec_extension();
        let mut conn = Connection::open_in_memory().unwrap();
        init_vec_schema(&conn);

        let doc_id = "test_doc_rollback";
        let test_file = TempFileGuard::create_with_content("chunk 1\n\nchunk 2");
        let (endpoint, server) = spawn_mock_embedding_server(vec![384, 10]).await;
        let _endpoint_guard = TestEndpointGuard::set(endpoint);

        conn.execute(
            "INSERT INTO documents (id, filename, path, file_hash) VALUES (?1, ?2, ?3, ?4)",
            params![
                doc_id,
                "test_doc_rollback.txt",
                test_file.as_str(),
                "test-hash-rollback"
            ],
        )
        .unwrap();

        let result = generate_document_embeddings(&mut conn).await;
        assert!(result.is_err());

        let node_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM nodes WHERE document_id = ?1",
                params![doc_id],
                |row| row.get(0),
            )
            .unwrap();
        let joined_row: Option<i64> = conn
            .query_row(
                "SELECT n.rowid FROM nodes n JOIN vec_nodes v ON n.rowid = v.rowid WHERE n.document_id = ?1 LIMIT 1",
                params![doc_id],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(node_count, 0);
        assert!(joined_row.is_none());

        server.await.expect("mock server task should complete");
    }
}
