import { clearToken, getToken, setToken } from './storage';
import type { AuthResponse } from './types';

export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/$/, '') ?? 'http://localhost:3010/api/v1';

const ACCESS = 'lapse.access';
const REFRESH = 'lapse.refresh';

let accessTokenMem: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onAuthFailed: () => void = () => {};

export function setAuthFailedHandler(fn: () => void) { onAuthFailed = fn; }

export async function bootstrapAuth(): Promise<{ access: string | null; refresh: string | null }> {
  const access = await getToken(ACCESS);
  const refresh = await getToken(REFRESH);
  accessTokenMem = access ?? null;
  return { access, refresh };
}

export async function persistTokens(access: string, refresh: string) {
  accessTokenMem = access;
  await setToken(ACCESS, access);
  await setToken(REFRESH, refresh);
}

export async function clearTokens() {
  accessTokenMem = null;
  await clearToken(ACCESS);
  await clearToken(REFRESH);
}

async function rotateRefresh(): Promise<string | null> {
  const refresh = await getToken(REFRESH);
  if (!refresh) return null;
  const r = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!r.ok) { await clearTokens(); return null; }
  const json: { accessToken: string; refreshToken: string } = await r.json();
  await persistTokens(json.accessToken, json.refreshToken);
  return json.accessToken;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Surfaced to callers so screens can show "offline" state instead of erroring.
export class OfflineError extends Error {
  constructor(message = 'Offline') {
    super(message);
    this.name = 'OfflineError';
  }
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: any;
  auth?: boolean; // default true
  signal?: AbortSignal;
  timeoutMs?: number; // default 12000
  headers?: Record<string, string>; // extra request headers (e.g. Idempotency-Key)
}

export async function api<T = any>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, timeoutMs = 12_000, headers: extraHeaders } = opts;

  // Offline path: for GETs, serve the persisted cache so screens render with
  // last-known data instead of hanging or throwing. Mutations still throw an
  // OfflineError so callers can route them to the sync queue.
  if (isOffline()) {
    if (method === 'GET' && !path.startsWith('/auth/')) {
      const { readCache } = await import('./cache');
      const hit = await readCache<T>(path);
      if (hit !== undefined) return hit;
    }
    throw new OfflineError();
  }

  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (extraHeaders) Object.assign(headers, extraHeaders);

  const attach = async () => {
    if (!auth) return;
    if (!accessTokenMem) accessTokenMem = await getToken(ACCESS);
    if (accessTokenMem) headers['authorization'] = `Bearer ${accessTokenMem}`;
  };
  await attach();

  // Belt-and-braces timeout — even when navigator.onLine is true the WebView
  // can sit on a half-open socket for minutes. Cap every request.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true });

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });

  let res: Response;
  try {
    res = await doFetch();
  } catch (e: any) {
    clearTimeout(timer);
    // Network died mid-request (DNS, TLS, Wi-Fi drop). For GETs, fall back to
    // the persisted cache so the screen still has something to render.
    if (method === 'GET' && !path.startsWith('/auth/')) {
      const { readCache } = await import('./cache');
      const hit = await readCache<T>(path);
      if (hit !== undefined) return hit;
    }
    if (e?.name === 'AbortError') throw new OfflineError('Request timed out');
    throw new OfflineError(e?.message ?? 'Network unreachable');
  }
  if (res.status === 401 && auth) {
    // Single-flight refresh
    if (!refreshPromise) refreshPromise = rotateRefresh().finally(() => { refreshPromise = null; });
    const newAccess = await refreshPromise;
    if (newAccess) {
      headers['authorization'] = `Bearer ${newAccess}`;
      try { res = await doFetch(); } catch (e: any) {
        clearTimeout(timer);
        throw new OfflineError(e?.message ?? 'Network unreachable');
      }
    } else {
      clearTimeout(timer);
      onAuthFailed();
      throw new ApiError(401, 'Unauthenticated', null);
    }
  }

  clearTimeout(timer);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const msg = typeof json === 'object' && json && 'error' in json ? json.error : res.statusText;
    throw new ApiError(res.status, String(msg ?? 'Request failed'), json);
  }

  // Write-through cache for GETs so screens that still use the bare api()
  // contract benefit from offline reads via useCachedApi or peekCache.
  if (method === 'GET' && !path.startsWith('/auth/')) {
    // Lazy import to avoid a cycle (cache → db → … unrelated). The await
    // doesn't block — fire and forget; failure is non-fatal.
    import('./cache').then(({ writeCache }) => { writeCache(path, json); }).catch(() => {});
  }

  return json as T;
}

// Convenience wrappers used throughout the app.
export const apiAuth = {
  login: (email: string, password: string, staysLoggedIn = false) =>
    api<AuthResponse>('/auth/login', { method: 'POST', auth: false, body: { email, password, staysLoggedIn } }),
  register: (email: string, password: string, name: string) =>
    api<AuthResponse>('/auth/register', { method: 'POST', auth: false, body: { email, password, name } }),
  forgot: (email: string) =>
    api<void>('/auth/forgot', { method: 'POST', auth: false, body: { email } }),
  reset: (token: string, password: string) =>
    api<void>('/auth/reset', { method: 'POST', auth: false, body: { token, password } }),
};

export function getAccessToken(): string | null { return accessTokenMem; }
