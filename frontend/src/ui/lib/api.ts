import { useAuthStore } from '../store/authStore';

const envUrl = import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim();

/** Në `vite dev`, nëse nuk ke VITE_API_URL, përdor proxy `/api` → localhost:3001. */
export const API_BASE = envUrl
  ? envUrl.replace(/\/$/, '')
  : import.meta.env.DEV
    ? '/api'
    : 'http://localhost:3001';

/** Për Socket.IO: kur `VITE_API_URL` është i vendosur, përdor atë (p.sh. produksion).
 *  Në dev pa `VITE_API_URL`, Vite proxy-on `/socket.io` → backend lokalisht. */
export function getSocketBaseUrl(): string {
  if (envUrl) return envUrl.replace(/\/$/, '');
  // Dev mode: proxy nëpërmjet Vite → window.origin (localhost:5173)
  if (import.meta.env.DEV && typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3001';
}

export function adminAuthHeaders(): Record<string, string> {
  const t = useAuthStore.getState().adminToken;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function userAuthHeaders(): Record<string, string> {
  const t = useAuthStore.getState().userToken;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Alias për panelin admin (JWT i veçantë nga klienti). */
export const authHeaders = adminAuthHeaders;
