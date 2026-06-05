import { useAuthStore } from '../store/authStore';

const envUrl = import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim();

export const API_BASE = envUrl
  ? envUrl.replace(/\/$/, '')
  : import.meta.env.DEV
    ? '/api'
    : 'http://localhost:3001';


export function getSocketBaseUrl(): string {
  if (envUrl) return envUrl.replace(/\/$/, '');

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

export const authHeaders = adminAuthHeaders;
