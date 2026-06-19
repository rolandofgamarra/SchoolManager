// URL base de la API. Con el proxy de Vite, las peticiones a /api/...
// se redirigen automáticamente al backend (sin problemas de CORS en dev).
// En producción, usar la variable de entorno VITE_API_URL.
export const API_BASE = import.meta.env.VITE_API_URL ?? '';

// Primary fetch method — use this instead of window.fetch for API calls
// Automatically handles JWT refresh on 401
export { fetchWithAuth } from './fetchWithAuth';

export function authHeaders(token: string | null): HeadersInit {
  return {
    'Authorization': `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export function authHeadersMultipart(token: string | null): HeadersInit {
  // No incluir Content-Type: el browser lo pone automáticamente con el boundary correcto
  return { 'Authorization': `Bearer ${token ?? ''}` };
}
