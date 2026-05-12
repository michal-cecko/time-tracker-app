import { create } from 'zustand';

export type Theme = 'dark' | 'bright';
export type Density = 'compact' | 'regular' | 'comfy';

export interface Tweaks {
  theme: Theme;
  accentHex: string;
  density: Density;
  fontScale: number;
  showOffline: boolean;
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
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  return defaults();
}

function defaults(): Tweaks {
  return { theme: 'dark', accentHex: '#FF7A45', density: 'regular', fontScale: 1.0, showOffline: false };
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
