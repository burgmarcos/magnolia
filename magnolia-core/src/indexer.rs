use rusqlite::{params, Connection};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use uuid::Uuid;
use walkdir::WalkDir;

pub fn index_directory(conn: &mut Connection, dir_path: &str) -> Result<usize, String> {
    let path = Path::new(dir_path);
    if !path.exists() || !path.is_dir() {
        return Err("Invalid directory path".into());
    }

    let mut indexed_count = 0;

    // We'll wrap insertions in a transaction for massive speed improvements
    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction error: {}", e))?;

    // Pre-fetch paths and hashes only for this directory to avoid N+1 queries
    // and unbound memory loading
    let mut existing_docs = HashMap::new();
    {
        // Use a directory-bounded prefix pattern and escape LIKE wildcards
        // so `%`/`_` in directory names are treated as literals.
        let mut stmt = tx
            .prepare(
                "SELECT path, file_hash
                 FROM documents
                 WHERE path = ?1
                    OR path LIKE ?2 ESCAPE '\\'",
            )
            .map_err(|e| format!("Prepare error: {}", e))?;

        let path_str = path.to_string_lossy().to_string();
        let child_prefix = if path_str.ends_with(std::path::MAIN_SEPARATOR) {
            path_str.clone()
        } else {
            format!("{}{}", path_str, std::path::MAIN_SEPARATOR)
        };
        let escaped_child_prefix = escape_like_pattern(&child_prefix);
        let like_pattern = format!("{}%", escaped_child_prefix);
        let rows = stmt
            .query_map(params![path_str, like_pattern], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| format!("Query error: {}", e))?;

        for row in rows {
            let (path, hash) = row.map_err(|e| format!("Row read error: {}", e))?;
            existing_docs.insert(path, hash);
        }
    }

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let extension = entry
                .path()
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");

            // For now, specifically targeting markdown/text files for RAG
            if extension == "md" || extension == "txt" {
                if let Ok(content) = fs::read(entry.path()) {
                    let mut hasher = Sha256::new();
                    hasher.update(&content);
                    let file_hash = format!("{:x}", hasher.finalize());

                    let file_path = entry.path().to_string_lossy().to_string();
                    let filename = entry.file_name().to_string_lossy().to_string();

                    let existing_hash = existing_docs.get(&file_path);

                    match existing_hash {
                        Some(hash) if *hash == file_hash => {
                            // File exists and hasn't changed, skip
                            continue;
                        }
                        Some(_) => {
                            // Hash changed, we update
                            tx.execute(
                                "UPDATE documents SET file_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE path = ?2",
                                params![file_hash, file_path]
                            ).map_err(|e| format!("DB Update error: {}", e))?;
                            indexed_count += 1;
                            // Optionally, we should invalidate/delete downstream `nodes` for this document_id
                        }
                        None => {
                            // New file
                            let new_id = Uuid::new_v4().to_string();
                            tx.execute(
                                "INSERT INTO documents (id, filename, path, file_hash) VALUES (?1, ?2, ?3, ?4)",
                                params![new_id, filename, file_path, file_hash]
                            ).map_err(|e| format!("DB Insert error: {}", e))?;
                            indexed_count += 1;
                        }
                    }
                }
            }
        }
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit index: {}", e))?;

    Ok(indexed_count)
}

fn escape_like_pattern(input: &str) -> String {
    input
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn index_directory_prefetch_is_directory_bounded_and_skips_unchanged_files() {
        let mut conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch(
            "
            CREATE TABLE documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                path TEXT UNIQUE NOT NULL,
                file_hash TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            );
            ",
        )
        .expect("create documents table");

        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let base_dir = std::env::temp_dir().join(format!("magnolia-indexer-test-{nanos}"));
        let target_dir = base_dir.join("docs_%_dir");
        let sibling_dir = base_dir.join("docs_%_dir_extra");
        fs::create_dir_all(&target_dir).expect("create target dir");
        fs::create_dir_all(&sibling_dir).expect("create sibling dir");

        let unchanged_path = target_dir.join("same.md");
        let changed_path = target_dir.join("changed.txt");
        let new_path = target_dir.join("new.md");
        let outside_path = sibling_dir.join("outside.md");

        fs::write(&unchanged_path, b"same content").expect("write unchanged file");
        fs::write(&changed_path, b"updated content").expect("write changed file");
        fs::write(&new_path, b"brand new content").expect("write new file");
        fs::write(&outside_path, b"outside content").expect("write outside file");

        let unchanged_hash = hash_bytes(b"same content");
        let changed_old_hash = hash_bytes(b"old content");
        let changed_new_hash = hash_bytes(b"updated content");
        let outside_hash = hash_bytes(b"outside content");

        conn.execute(
            "INSERT INTO documents (id, filename, path, file_hash) VALUES (?1, ?2, ?3, ?4)",
            params![
                "unchanged-id",
                "same.md",
                unchanged_path.to_string_lossy().to_string(),
                unchanged_hash
            ],
        )
        .expect("seed unchanged row");
        conn.execute(
            "INSERT INTO documents (id, filename, path, file_hash) VALUES (?1, ?2, ?3, ?4)",
            params![
                "changed-id",
                "changed.txt",
                changed_path.to_string_lossy().to_string(),
                changed_old_hash
            ],
        )
        .expect("seed changed row");
        conn.execute(
            "INSERT INTO documents (id, filename, path, file_hash) VALUES (?1, ?2, ?3, ?4)",
            params![
                "outside-id",
                "outside.md",
                outside_path.to_string_lossy().to_string(),
                outside_hash.clone()
            ],
        )
        .expect("seed outside row");

        let indexed = index_directory(&mut conn, &target_dir.to_string_lossy()).expect("index");
        assert_eq!(indexed, 2, "only changed and new files should be indexed");

        let unchanged_db_hash: String = conn
            .query_row(
                "SELECT file_hash FROM documents WHERE path = ?1",
                params![unchanged_path.to_string_lossy().to_string()],
                |row| row.get(0),
            )
            .expect("fetch unchanged hash");
        assert_eq!(unchanged_db_hash, hash_bytes(b"same content"));

        let changed_db_hash: String = conn
            .query_row(
                "SELECT file_hash FROM documents WHERE path = ?1",
                params![changed_path.to_string_lossy().to_string()],
                |row| row.get(0),
            )
            .expect("fetch changed hash");
        assert_eq!(changed_db_hash, changed_new_hash);

        let new_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM documents WHERE path = ?1",
                params![new_path.to_string_lossy().to_string()],
                |row| row.get(0),
            )
            .expect("count new row");
        assert_eq!(new_count, 1);

        let outside_db_hash: String = conn
            .query_row(
                "SELECT file_hash FROM documents WHERE path = ?1",
                params![outside_path.to_string_lossy().to_string()],
                |row| row.get(0),
            )
            .expect("fetch outside hash");
        assert_eq!(outside_db_hash, outside_hash);

        let _ = fs::remove_dir_all(&base_dir);
    }

    fn hash_bytes(content: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content);
        format!("{:x}", hasher.finalize())
    }
}
