import { create } from 'zustand';

export interface RunningTimer {
  entryId: string;
  taskId: string;
  taskTitle?: string;
  projectId?: string;
  projectColor?: string;
  startedAt: string; // ISO
}

interface RunningStore {
  running: RunningTimer | null;
  elapsed: number; // seconds, ticked client-side
  setRunning: (r: RunningTimer | null) => void;
  tick: () => void;
}

export const useRunning = create<RunningStore>((set, get) => ({
  running: null,
  elapsed: 0,
  setRunning: (r) => {
    if (!r) return set({ running: null, elapsed: 0 });
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(r.startedAt).getTime()) / 1000));
    set({ running: r, elapsed });
  },
  tick: () => {
    const r = get().running;
    if (!r) return;
    set({ elapsed: Math.max(0, Math.floor((Date.now() - new Date(r.startedAt).getTime()) / 1000)) });
  },
}));
