use rusqlite::Connection;
use std::time::Instant;

pub fn run_benchmark() {
    let mut conn = Connection::open_in_memory().unwrap();

    // Setup tables
    conn.execute(
        "CREATE TABLE documents (id TEXT PRIMARY KEY, path TEXT)",
        [],
    ).unwrap();
    conn.execute(
        "CREATE TABLE nodes (document_id TEXT, chunk_index INTEGER, content TEXT)",
        [],
    ).unwrap();
    conn.execute(
        "CREATE TABLE vec_nodes (rowid INTEGER PRIMARY KEY, embedding TEXT)",
        [],
    ).unwrap();

    // Populate documents
    for i in 0..10 {
        conn.execute(
            "INSERT INTO documents (id, path) VALUES (?1, ?2)",
            [&format!("doc_{}", i), &format!("path/to/doc_{}.txt", i)],
        ).unwrap();
        // create dummy file? No, generate_document_embeddings uses fs::read_to_string, which would fail.
    }
}
