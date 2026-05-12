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

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: any;
  auth?: boolean; // default true
  signal?: AbortSignal;
}

export async function api<T = any>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';

  const attach = async () => {
    if (!auth) return;
    if (!accessTokenMem) accessTokenMem = await getToken(ACCESS);
    if (accessTokenMem) headers['authorization'] = `Bearer ${accessTokenMem}`;
  };
  await attach();

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

  let res = await doFetch();
  if (res.status === 401 && auth) {
    // Single-flight refresh
    if (!refreshPromise) refreshPromise = rotateRefresh().finally(() => { refreshPromise = null; });
    const newAccess = await refreshPromise;
    if (newAccess) {
      headers['authorization'] = `Bearer ${newAccess}`;
      res = await doFetch();
    } else {
      onAuthFailed();
      throw new ApiError(401, 'Unauthenticated', null);
    }
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const msg = typeof json === 'object' && json && 'error' in json ? json.error : res.statusText;
    throw new ApiError(res.status, String(msg ?? 'Request failed'), json);
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
