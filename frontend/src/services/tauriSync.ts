import { invoke } from '@tauri-apps/api/core';

export interface SyncPayload {
  items: any[];
}

/**
 * Service to handle offline syncing utilizing the Tauri Rust backend.
 * By delegating large sync queues to Rust, we prevent the browser's main thread
 * from freezing (bottleneck) when reconnecting after being offline.
 */
export const TauriSyncService = {
  /**
   * Invokes the Rust command to process an offline queue in the background.
   */
  async syncOfflineQueue(payload: SyncPayload): Promise<string> {
    try {
      // Calls the `sync_offline_queue` command defined in main.rs
      const response = await invoke<string>('sync_offline_queue', { payload });
      console.log('Rust Sync Response:', response);
      return response;
    } catch (error) {
      console.error('Failed to invoke Rust sync:', error);
      throw error;
    }
  }
};
