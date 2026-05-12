import { create } from 'zustand';
import type { Tab } from '@/components/ui/TabBar';

export type StackEntry =
  | { kind: 'task'; id: string }
  | { kind: 'project'; id: string }
  | { kind: 'history' }
  | { kind: 'manual'; entryId?: string; taskId?: string }
  | { kind: 'settings' }
  | { kind: 'search' }
  | { kind: 'focus' }
  | { kind: 'quickAdd' }
  | { kind: 'tweaks' }
  | { kind: 'syncSheet' };

interface Nav {
  tab: Tab;
  stack: StackEntry[];
  setTab: (t: Tab) => void;
  push: (e: StackEntry) => void;
  back: () => void;
  reset: () => void;
}

export const useNav = create<Nav>((set) => ({
  tab: 'today',
  stack: [],
  setTab: (t) => set({ tab: t, stack: [] }),
  push: (e) => set((s) => ({ stack: [...s.stack, e] })),
  back: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  reset: () => set({ stack: [] }),
}));
