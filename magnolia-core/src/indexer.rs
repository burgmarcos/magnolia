use rayon::prelude::*;
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

    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction error: {}", e))?;

    // Pre-fetch paths and hashes only for this directory to avoid N+1 queries
    // and unbound memory loading
    let mut existing_docs = HashMap::new();
    {
        // Use LIKE with the directory path to only fetch relevant documents
        // Using || '%' correctly formats the pattern for SQLite
        let mut stmt = tx
            .prepare("SELECT path, file_hash FROM documents WHERE path LIKE ?1 || '%'")
            .map_err(|e| format!("Prepare error: {}", e))?;

        let path_str = path.to_string_lossy().to_string();
        let rows = stmt
            .query_map(params![path_str], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| format!("Query error: {}", e))?;

        for row in rows.flatten() {
            let (path, hash) = row;
            existing_docs.insert(path, hash);
        }
    }

    // Phase 1: Collect files synchronously
    let files_to_process: Vec<_> = WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|entry| {
            if entry.file_type().is_file() {
                let extension = entry
                    .path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("");
                extension == "md" || extension == "txt"
            } else {
                false
            }
        })
        .collect();

    // Phase 2: Read and hash files in parallel
    enum FileAction {
        Skip,
        Update {
            file_hash: String,
            file_path: String,
        },
        Insert {
            new_id: String,
            filename: String,
            file_path: String,
            file_hash: String,
        },
    }

    let actions: Vec<FileAction> = files_to_process
        .into_par_iter()
        .filter_map(|entry| {
            let file_path = entry.path().to_string_lossy().to_string();
            let filename = entry.file_name().to_string_lossy().to_string();

            if let Ok(content) = fs::read(entry.path()) {
                let mut hasher = Sha256::new();
                hasher.update(&content);
                let file_hash = format!("{:x}", hasher.finalize());

                let existing_hash = existing_docs.get(&file_path);

                match existing_hash {
                    Some(hash) if *hash == file_hash => Some(FileAction::Skip),
                    Some(_) => Some(FileAction::Update {
                        file_hash,
                        file_path,
                    }),
                    None => {
                        let new_id = Uuid::new_v4().to_string();
                        Some(FileAction::Insert {
                            new_id,
                            filename,
                            file_path,
                            file_hash,
                        })
                    }
                }
            } else {
                None
            }
        })
        .collect();

    // Phase 3: Execute DB operations synchronously
    let mut indexed_count = 0;
    let mut update_stmt = tx
        .prepare("UPDATE documents SET file_hash = ?1 WHERE path = ?2")
        .map_err(|e| format!("Prepare update error: {}", e))?;

    let mut insert_stmt = tx
        .prepare("INSERT INTO documents (id, filename, path, file_hash) VALUES (?1, ?2, ?3, ?4)")
        .map_err(|e| format!("Prepare insert error: {}", e))?;

    for action in actions {
        match action {
            FileAction::Skip => {}
            FileAction::Update {
                file_hash,
                file_path,
            } => {
                update_stmt
                    .execute(params![file_hash, file_path])
                    .map_err(|e| format!("DB Update error: {}", e))?;
                indexed_count += 1;
                // Optionally, we should invalidate/delete downstream `nodes` for this document_id
            }
            FileAction::Insert {
                new_id,
                filename,
                file_path,
                file_hash,
            } => {
                insert_stmt
                    .execute(params![new_id, filename, file_path, file_hash])
                    .map_err(|e| format!("DB Insert error: {}", e))?;
                indexed_count += 1;
            }
        }
    }

    drop(update_stmt);
    drop(insert_stmt);

    tx.commit()
        .map_err(|e| format!("Failed to commit index: {}", e))?;

    Ok(indexed_count)
}
