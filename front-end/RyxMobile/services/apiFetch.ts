import { API_BASE_URL, API_FETCH_TIMEOUT_MS } from '../config/api';
import { getAuthToken } from './authSession';

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const parent = init.signal;
  const onParentAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener('abort', onParentAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    parent?.removeEventListener('abort', onParentAbort);
  });
}

/**
 * Concatène l’origine API et un chemin qui commence par `/api/...`.
 * Si `EXPO_PUBLIC_API_URL` se termine par `/api` (ex. `http://IP:3000/api`),
 * évite `.../api` + `/api/auth` → `.../api/api/auth` (404 « Route non trouvée »).
 */
export function resolveApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  let p = path.startsWith('/') ? path : `/${path}`;
  if (/\/api$/i.test(base) && /^\/api\//i.test(p)) {
    p = p.replace(/^\/api/i, '') || '/';
  }
  return `${base}${p}`;
}

/** Requêtes authentifiées (Authorization: Bearer si un jeton est enregistré). */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = resolveApiUrl(path);
  const headers = new Headers(init.headers ?? undefined);
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  const token = await getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetchWithTimeout(url, { ...init, headers }, API_FETCH_TIMEOUT_MS);
}

/** Login, register, health, OTP — sans en-tête Authorization. */
export async function publicApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = resolveApiUrl(path);
  const headers = new Headers(init.headers ?? undefined);
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  return fetchWithTimeout(url, { ...init, headers }, API_FETCH_TIMEOUT_MS);
}
