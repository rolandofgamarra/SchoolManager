// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod sync;
mod commands;
mod updater;

use db::{init_db, DbState};
use std::sync::Mutex;

fn main() {
    let db_path = "local_database.sqlite";
    let conn = init_db(db_path).expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(DbState {
            conn: Mutex::new(conn),
        })
        .setup(|app| {
            updater::setup_updater(&app.handle());
            
            // Spawn sync loop
            tauri::async_runtime::spawn(async {
                sync::run_sync_loop().await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_nota
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
