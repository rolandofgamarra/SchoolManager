import { useAuthStore } from '../store/useAuthStore';

/**
 * Fetch wrapper that automatically handles JWT refresh on 401.
 * If access token expires, attempts to use refresh token to get a new one.
 * If refresh fails, logs out and redirects to login.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const store = useAuthStore.getState();
  const token = store.accessToken;

  // Add auth header if token exists
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // If not 401, return response as-is
  if (response.status !== 401) {
    return response;
  }

  // Token expired — attempt refresh
  const refreshToken = store.refreshToken;
  if (!refreshToken) {
    // No refresh token, user must login again
    store.logout();
    window.location.href = '/login';
    return response;
  }

  try {
    const refreshRes = await fetch('/api/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!refreshRes.ok) {
      // Refresh token invalid/expired
      store.logout();
      window.location.href = '/login';
      return refreshRes;
    }

    const data = await refreshRes.json();
    const newAccessToken = data.access;
    const newRefreshToken = data.refresh || refreshToken;

    // Update store with new tokens
    if (store.user) {
      store.login(newAccessToken, newRefreshToken, store.user);
    }

    // Retry original request with new token
    headers.set('Authorization', `Bearer ${newAccessToken}`);
    response = await fetch(url, { ...options, headers });

    return response;
  } catch (error) {
    console.error('Token refresh failed:', error);
    store.logout();
    window.location.href = '/login';
    return response;
  }
}
