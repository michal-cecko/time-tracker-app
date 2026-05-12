import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, bootstrapAuth, clearTokens, persistTokens, setAuthFailedHandler, apiAuth } from '@/api/client';
import { connectRealtime, disconnectRealtime } from '@/api/websocket';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hydrateTweaks = useTweaks((s) => s.hydrate);

  // Hook auth-failed -> sign out.
  useEffect(() => {
    setAuthFailedHandler(() => { setUser(null); disconnectRealtime(); });
  }, []);

  // Boot: try to silently load tokens + /me.
  useEffect(() => {
    (async () => {
      try {
        const { access } = await bootstrapAuth();
        if (!access) { setLoading(false); return; }
        const me = await api<User & { settings: any }>('/me');
        setUser({ id: me.id, email: me.email, name: me.name, avatarSeed: me.avatarSeed, plan: me.plan });
        if (me.settings) {
          hydrateTweaks({
            theme: me.settings.theme,
            accentHex: me.settings.accentHex,
            density: me.settings.density,
            fontScale: me.settings.fontScale,
          });
        }
        connectRealtime();
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, [hydrateTweaks]);

  const value = useMemo<AuthCtx>(() => ({
    user,
    loading,
    login: async (email, password, staysLoggedIn) => {
      const { user: u, accessToken, refreshToken } = await apiAuth.login(email, password, staysLoggedIn);
      await persistTokens(accessToken, refreshToken);
      setUser(u);
      try {
        const me = await api<User & { settings: any }>('/me');
        if (me.settings) {
          hydrateTweaks({
            theme: me.settings.theme,
            accentHex: me.settings.accentHex,
            density: me.settings.density,
            fontScale: me.settings.fontScale,
          });
        }
      } catch {}
      connectRealtime();
    },
    signup: async (email, password, name) => {
      const { user: u, accessToken, refreshToken } = await apiAuth.register(email, password, name);
      await persistTokens(accessToken, refreshToken);
      setUser(u);
      connectRealtime();
    },
    logout: async () => {
      disconnectRealtime();
      await clearTokens();
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
