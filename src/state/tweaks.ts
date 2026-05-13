import { create } from 'zustand';

export type Theme = 'dark' | 'bright' | 'system';

export interface Tweaks {
  theme: Theme;
  accentHex: string;
}

interface TweaksStore extends Tweaks {
  set: (patch: Partial<Tweaks>) => void;
  hydrate: (t: Partial<Tweaks>) => void;
}

const STORAGE_KEY = 'lapse.tweaks';

function loadInitial(): Tweaks {
  if (typeof localStorage === 'undefined') return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Tweaks>;
      // Tolerate old shapes (with density/fontScale/showOffline) — just pick
      // the two fields we still use.
      return {
        theme: (parsed.theme as Theme) ?? defaults().theme,
        accentHex: parsed.accentHex ?? defaults().accentHex,
      };
    }
  } catch {}
  return defaults();
}

function defaults(): Tweaks {
  return { theme: 'system', accentHex: '#FF7A45' };
}

function persist(t: Tweaks) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch {}
}

export const useTweaks = create<TweaksStore>((set, get) => ({
  ...loadInitial(),
  set: (patch) => {
    set(patch);
    persist({ ...get(), ...patch });
  },
  hydrate: (patch) => {
    set(patch);
    persist({ ...get(), ...patch });
  },
}));
