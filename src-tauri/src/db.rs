use rusqlite::{Connection, Result};
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init_db(db_path: &str) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS local_notes (
            local_id INTEGER PRIMARY KEY AUTOINCREMENT,
            alumno_id INTEGER NOT NULL,
            materia_id INTEGER NOT NULL,
            valor REAL NOT NULL,
            timestamp_utc TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'PENDING'
        )",
        (),
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operacion TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            intentos INTEGER NOT NULL DEFAULT 0,
            ultimo_error TEXT,
            created_at TEXT NOT NULL,
            resolved_at TEXT
        )",
        (),
    )?;

    Ok(conn)
}
