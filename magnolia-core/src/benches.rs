use rusqlite::{params, Connection};
use std::time::Instant;

pub fn run_benchmark() {
    let mut conn1 = Connection::open_in_memory().unwrap();
    let mut conn2 = Connection::open_in_memory().unwrap();

    for conn in [&mut conn1, &mut conn2] {
        conn.execute("CREATE TABLE nodes (document_id TEXT, chunk_index INTEGER, content TEXT)", []).unwrap();
        conn.execute("CREATE TABLE vec_nodes (rowid INTEGER PRIMARY KEY, embedding TEXT)", []).unwrap();
    }

    let num_records = 1000;

    // N+1 approach
    let start = Instant::now();
    for i in 0..num_records {
        let tx = conn1.transaction().unwrap();
        tx.execute(
            "INSERT INTO nodes (document_id, chunk_index, content) VALUES (?1, ?2, ?3)",
            params!["doc1", i, "some content"],
        ).unwrap();
        let rowid = tx.last_insert_rowid();
        tx.execute(
            "INSERT INTO vec_nodes(rowid, embedding) VALUES (?1, ?2)",
            params![rowid, "[0.1, 0.2]"],
        ).unwrap();
        tx.commit().unwrap();
    }
    let duration1 = start.elapsed();

    // Batch approach
    let start = Instant::now();
    let tx = conn2.transaction().unwrap();
    {
        let mut stmt1 = tx.prepare("INSERT INTO nodes (document_id, chunk_index, content) VALUES (?1, ?2, ?3)").unwrap();
        let mut stmt2 = tx.prepare("INSERT INTO vec_nodes(rowid, embedding) VALUES (?1, ?2)").unwrap();
        for i in 0..num_records {
            stmt1.execute(params!["doc1", i, "some content"]).unwrap();
            let rowid = tx.last_insert_rowid();
            stmt2.execute(params![rowid, "[0.1, 0.2]"]).unwrap();
        }
    }
    tx.commit().unwrap();
    let duration2 = start.elapsed();

    println!("N+1 duration: {:?}", duration1);
    println!("Batch duration: {:?}", duration2);
}
