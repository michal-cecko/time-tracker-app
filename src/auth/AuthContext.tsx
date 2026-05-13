import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, bootstrapAuth, clearTokens, persistTokens, setAuthFailedHandler, apiAuth, isOffline, OfflineError } from '@/api/client';
import { connectRealtime, disconnectRealtime } from '@/api/websocket';
import { prefetchAll } from '@/api/prefetch';
import type { User } from '@/api/types';
import { useTweaks } from '@/state/tweaks';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, staysLoggedIn?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

// Cache the last successful /me payload so the app can boot offline. Cleared
// on explicit logout and on hard auth failure.
const USER_CACHE = 'lapse.user';

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCachedUser(u: User | null) {
  try {
    if (u) localStorage.setItem(USER_CACHE, JSON.stringify(u));
    else localStorage.removeItem(USER_CACHE);
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hydrateTweaks = useTweaks((s) => s.hydrate);

  // Hook auth-failed -> sign out (only fires on a real 401 from the server).
  useEffect(() => {
    setAuthFailedHandler(() => {
      setUser(null);
      writeCachedUser(null);
      disconnectRealtime();
    });
  }, []);

  // Boot — three paths:
  //   1) Token + online: hit /me, cache result, connect WS.
  //   2) Token + offline: use the cached /me payload; mark loading done and
  //      let screens render in offline mode. /me will re-sync via the online
  //      event listener below.
  //   3) No token: show login.
  useEffect(() => {
    (async () => {
      const { access } = await bootstrapAuth();
      if (!access) { setLoading(false); return; }

      // Cached identity first so the UI can render immediately even if /me
      // is slow or unreachable.
      const cached = readCachedUser();
      if (cached) setUser(cached);

      if (isOffline()) {
        setLoading(false);
        return;
      }

      try {
        const me = await api<User & { settings: any }>('/me');
        const u: User = { id: me.id, email: me.email, name: me.name, avatarSeed: me.avatarSeed, plan: me.plan };
        setUser(u);
        writeCachedUser(u);
        if (me.settings) {
          hydrateTweaks({
            theme: me.settings.theme,
            accentHex: me.settings.accentHex,
          });
        }
        connectRealtime();
        // Warm the whole read-cache so every screen is navigable offline.
        prefetchAll();
      } catch (e) {
        // Network error → keep the cached user so the app is still usable.
        // Real 401s clear via setAuthFailedHandler above.
        if (!(e instanceof OfflineError) && !cached) {
          await clearTokens();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [hydrateTweaks]);

  // When the network comes back, try to re-sync identity + reopen WS + rewarm.
  useEffect(() => {
    const onUp = async () => {
      try {
        const me = await api<User & { settings: any }>('/me');
        const u: User = { id: me.id, email: me.email, name: me.name, avatarSeed: me.avatarSeed, plan: me.plan };
        setUser(u);
        writeCachedUser(u);
        connectRealtime();
        prefetchAll();
      } catch { /* still offline or auth lost; ignore */ }
    };
    window.addEventListener('online', onUp);
    return () => window.removeEventListener('online', onUp);
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user,
    loading,
    login: async (email, password, staysLoggedIn) => {
      const { user: u, accessToken, refreshToken } = await apiAuth.login(email, password, staysLoggedIn);
      await persistTokens(accessToken, refreshToken);
      setUser(u);
      writeCachedUser(u);
      try {
        const me = await api<User & { settings: any }>('/me');
        if (me.settings) {
          hydrateTweaks({
            theme: me.settings.theme,
            accentHex: me.settings.accentHex,
          });
        }
      } catch {}
      connectRealtime();
      // Warm the read-cache in the background so every screen is offline-ready
      // before the user even navigates there.
      prefetchAll();
    },
    signup: async (email, password, name) => {
      const { user: u, accessToken, refreshToken } = await apiAuth.register(email, password, name);
      await persistTokens(accessToken, refreshToken);
      setUser(u);
      writeCachedUser(u);
      connectRealtime();
      prefetchAll();
    },
    logout: async () => {
      disconnectRealtime();
      await clearTokens();
      writeCachedUser(null);
      setUser(null);
    },
  }), [user, loading, hydrateTweaks]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
