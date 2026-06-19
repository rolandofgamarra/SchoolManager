import { create } from 'zustand';
import { secureStorage } from '../lib/secureStorage';

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  tenant_id: number | null;
  avatar_url?: string | null;
};

type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (access: string, refresh: string, user: AuthUser) => void;
  logout: () => void;
  setAvatarUrl: (url: string | null) => void;
  hydrateFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  user: null,

  login: async (access, refresh, user) => {
    await secureStorage.setItem('access_token', access);
    await secureStorage.setItem('refresh_token', refresh);
    if (user) await secureStorage.setItem('user_profile', JSON.stringify(user));
    set({ isAuthenticated: true, accessToken: access, refreshToken: refresh, user });
  },

  logout: async () => {
    await secureStorage.removeItem('access_token');
    await secureStorage.removeItem('refresh_token');
    await secureStorage.removeItem('user_profile');
    set({ isAuthenticated: false, accessToken: null, refreshToken: null, user: null });
  },

  setAvatarUrl: async (url) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, avatar_url: url };
    await secureStorage.setItem('user_profile', JSON.stringify(updated));
    set({ user: updated });
  },

  hydrateFromStorage: async () => {
    const token = await secureStorage.getItem('access_token');
    const refresh = await secureStorage.getItem('refresh_token');
    const profile = await secureStorage.getItem('user_profile');
    const user = profile ? JSON.parse(profile) : null;
    set({
      isAuthenticated: !!token,
      accessToken: token,
      refreshToken: refresh,
      user,
    });
  },
}));
