// Token persistence. Uses Capacitor Preferences on native (encrypted on iOS),
// localStorage on the web. Same async surface either way.

let preferencesPromise: Promise<any> | null = null;

async function preferences() {
  if ((window as any).Capacitor?.isNativePlatform?.()) {
    if (!preferencesPromise) preferencesPromise = import('@capacitor/preferences').then((m) => m.Preferences);
    return await preferencesPromise;
  }
  return null;
}

export async function getToken(key: string): Promise<string | null> {
  const p = await preferences();
  if (p) return (await p.get({ key })).value ?? null;
  return localStorage.getItem(key);
}

export async function setToken(key: string, value: string): Promise<void> {
  const p = await preferences();
  if (p) await p.set({ key, value });
  else localStorage.setItem(key, value);
}

export async function clearToken(key: string): Promise<void> {
  const p = await preferences();
  if (p) await p.remove({ key });
  else localStorage.removeItem(key);
}
