use rusqlite::{Connection, Result};
use std::path::Path;

pub fn initialize_database(app_data_dir: &Path) -> Result<Connection> {
    #[allow(clippy::missing_transmute_annotations)]
    unsafe {
        rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
            sqlite_vec::sqlite3_vec_init as *const (),
        )));
    }

    let db_path = app_data_dir.join("Magnolia_core.db");
    let mut conn = Connection::open(&db_path)?;

    // Enable WAL mode for better concurrency and performance
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;

    run_migrations(&mut conn)?;

    Ok(conn)
}

fn run_migrations(conn: &mut Connection) -> Result<()> {
    let tx = conn.transaction()?;

    tx.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(chat_id) REFERENCES chats(id)
        );

        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            path TEXT UNIQUE NOT NULL,
            file_hash TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS nodes (
            rowid INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT,
            FOREIGN KEY(document_id) REFERENCES documents(id)
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS vec_nodes USING vec0(
            embedding float[384]
        );

        CREATE TABLE IF NOT EXISTS edges (
            id TEXT PRIMARY KEY,
            source_node_id INTEGER NOT NULL,
            target_node_id INTEGER NOT NULL,
            relationship_type TEXT,
            FOREIGN KEY(source_node_id) REFERENCES nodes(rowid),
            FOREIGN KEY(target_node_id) REFERENCES nodes(rowid)
        );
        ",
    )?;

    tx.commit()?;
    Ok(())
}
