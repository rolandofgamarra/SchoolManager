import { create } from 'zustand';

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
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  user: JSON.parse(localStorage.getItem('user_profile') || 'null'),

  login: (access, refresh, user) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    if (user) localStorage.setItem('user_profile', JSON.stringify(user));
    set({ isAuthenticated: true, accessToken: access, refreshToken: refresh, user });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_profile');
    set({ isAuthenticated: false, accessToken: null, refreshToken: null, user: null });
  },

  setAvatarUrl: (url) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, avatar_url: url };
    localStorage.setItem('user_profile', JSON.stringify(updated));
    set({ user: updated });
  },
}));
