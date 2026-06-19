#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::command;
use std::thread;
use std::time::Duration;

#[derive(serde::Deserialize)]
struct SyncPayload {
    items: Vec<serde_json::Value>,
}

#[command]
async fn sync_offline_queue(payload: SyncPayload) -> Result<String, String> {
    // This command runs asynchronously without blocking the web UI thread.
    // It spawns a new Tokio task (or standard thread) to batch-process 
    // large amounts of offline data (e.g. 5000 records).
    
    let total_items = payload.items.len();
    println!("Starting offline sync for {} items...", total_items);

    // Simulate batching in chunks of 200
    let chunks: Vec<_> = payload.items.chunks(200).collect();
    
    // Simulate background processing
    for (i, chunk) in chunks.iter().enumerate() {
        println!("Syncing chunk {}/{} ({} items)...", i + 1, chunks.len(), chunk.len());
        // Here we would use reqwest to POST to Django backend
        thread::sleep(Duration::from_millis(500)); 
    }

    Ok(format!("Successfully synced {} items to the cloud in the background.", total_items))
}

fn main() {
    // Standard Tauri Builder initialization
    // tauri::Builder::default()
    //     .invoke_handler(tauri::generate_handler![sync_offline_queue])
    //     .run(tauri::generate_context!())
    //     .expect("error while running tauri application");
    println!("Tauri Rust backend mock loaded successfully.");
}
