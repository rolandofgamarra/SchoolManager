use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

pub fn setup_updater(app: &AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        match handle.updater() {
            Ok(updater) => {
                if let Ok(Some(update)) = updater.check().await {
                    let _ = update.download_and_install(|_, _| {}, || {}).await;
                }
            }
            Err(e) => println!("Updater not configured correctly: {}", e),
        }
    });
}
