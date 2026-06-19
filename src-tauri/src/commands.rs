use tauri::State;
use crate::db::DbState;
use rusqlite::params;
use chrono::Utc;

#[tauri::command]
pub fn save_nota(state: State<'_, DbState>, alumno_id: i32, materia_id: i32, valor: f64) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    let timestamp = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO local_notes (alumno_id, materia_id, valor, timestamp_utc) VALUES (?1, ?2, ?3, ?4)",
        params![alumno_id, materia_id, valor, timestamp],
    ).map_err(|e| e.to_string())?;

    let payload = format!("{{\"alumno_id\":{},\"materia_id\":{},\"valor\":{}}}", alumno_id, materia_id, valor);
    
    conn.execute(
        "INSERT INTO sync_queue (operacion, payload_json, created_at) VALUES ('SAVE_NOTA', ?1, ?2)",
        params![payload, timestamp],
    ).map_err(|e| e.to_string())?;

    Ok("Nota saved locally and queued for sync".to_string())
}
