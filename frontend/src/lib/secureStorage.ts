/**
 * Abstraction for secure token storage.
 * Uses tauri-plugin-store on desktop (encrypted by OS), localStorage on web.
 */

let isTauriEnv = false;

// Check if running in Tauri at runtime
if (typeof window !== 'undefined') {
  isTauriEnv = '__TAURI__' in window;
}

// Lazy load Tauri store plugin only when needed
let store: any = null;

async function getTauriStore() {
  if (store) return store;
  try {
    const { Store } = await import('@tauri-apps/plugin-store');
    store = new Store('auth.json');
    return store;
  } catch (err) {
    console.warn('Failed to initialize Tauri store, falling back to localStorage', err);
    return null;
  }
}

/**
 * Secure storage adapter that auto-detects environment
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isTauriEnv) {
      try {
        const store = await getTauriStore();
        if (store) {
          const value = await store.get(key);
          return value ?? null;
        }
      } catch (err) {
        console.error('Error reading from Tauri store:', err);
      }
    }
    // Fallback to localStorage (web or if Tauri fails)
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isTauriEnv) {
      try {
        const store = await getTauriStore();
        if (store) {
          await store.set(key, value);
          return;
        }
      } catch (err) {
        console.error('Error writing to Tauri store:', err);
      }
    }
    // Fallback to localStorage
    localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isTauriEnv) {
      try {
        const store = await getTauriStore();
        if (store) {
          await store.delete(key);
          return;
        }
      } catch (err) {
        console.error('Error deleting from Tauri store:', err);
      }
    }
    // Fallback to localStorage
    localStorage.removeItem(key);
  },

  async clear(): Promise<void> {
    if (isTauriEnv) {
      try {
        const store = await getTauriStore();
        if (store) {
          // Clear all auth-related keys
          await store.delete('access_token');
          await store.delete('refresh_token');
          await store.delete('user_profile');
          return;
        }
      } catch (err) {
        console.error('Error clearing Tauri store:', err);
      }
    }
    // Fallback to localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_profile');
  },
};
