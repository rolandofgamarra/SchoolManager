use reqwest::Client;
use std::time::Duration;
use tauri::State;
use crate::db::DbState;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug)]
pub struct SyncPayload {
    pub operacion: String,
    pub payload_json: String,
}

pub async fn run_sync_loop() {
    let client = Client::new();
    let mut interval = tokio::time::interval(Duration::from_secs(30)); // 30 sec interval

    loop {
        interval.tick().await;
        // Logic to read from sync_queue and push to API goes here.
        // E.g., read pending operations, POST to /api/sync/, update status
        println!("Sync loop ticking...");
    }
}
