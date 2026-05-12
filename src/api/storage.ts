// Token persistence — synchronous localStorage on every platform.
//
// localStorage is available in the Capacitor WebView (Android + iOS), in the
// Tauri WebKit shell, and obviously in the browser. We previously used
// @capacitor/preferences via a dynamic import for slightly more secure native
// storage, but the dynamic import chunk can fail to load inside the Android
// WebView and silently hang the auth bootstrap. localStorage is good enough
// for a single-user time tracker and removes that whole class of failure.
//
// The function signatures stay async so callers don't have to change.

export async function getToken(key: string): Promise<string | null> {
  try { return localStorage.getItem(key); } catch { return null; }
}

export async function setToken(key: string, value: string): Promise<void> {
  try { localStorage.setItem(key, value); } catch {}
}

export async function clearToken(key: string): Promise<void> {
  try { localStorage.removeItem(key); } catch {}
}
