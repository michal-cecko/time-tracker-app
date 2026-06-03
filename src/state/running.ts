import { create } from 'zustand';
import { api } from '@/api/client';
import type { Project, Task, TimeEntry } from '@/api/types';

export interface RunningTimer {
  entryId: string;
  // Nullable — the user can start an unassigned timer and categorise it later.
  taskId: string | null;
  taskTitle?: string | null;
  projectId?: string;
  projectColor?: string;
  projectName?: string | null;
  startedAt: string; // ISO
}

interface RunningStore {
  // Every currently-running timer. Multiple may run at once — one per task,
  // plus at most one unassigned. Newest first.
  timers: RunningTimer[];
  // Wall-clock "now" in ms, ticked client-side once a second so every timer's
  // elapsed is derived (instead of storing N separate counters).
  now: number;
  setTimers: (t: RunningTimer[]) => void;
  // Add or replace a timer. Dedupes by entry id AND by logical slot (task, or
  // the single unassigned slot) so an optimistic "pending" entry is swapped for
  // the real one rather than left as a duplicate.
  upsertTimer: (t: RunningTimer) => void;
  removeTimer: (entryId: string) => void;
  removeByTask: (taskId: string | null) => void;
  clear: () => void;
  tick: () => void;
}

// Logical identity of a timer: a task can have one running timer; all
// unassigned timers collapse to a single slot (the backend enforces this).
function slotOf(t: RunningTimer): string {
  return t.taskId != null ? `task:${t.taskId}` : 'unassigned';
}

export const useRunning = create<RunningStore>((set) => ({
  timers: [],
  now: Date.now(),
  setTimers: (timers) => set({ timers, now: Date.now() }),
  upsertTimer: (t) => set((s) => {
    const slot = slotOf(t);
    const rest = s.timers.filter((x) => x.entryId !== t.entryId && slotOf(x) !== slot);
    return { timers: [t, ...rest], now: Date.now() };
  }),
  removeTimer: (entryId) => set((s) => ({ timers: s.timers.filter((x) => x.entryId !== entryId) })),
  removeByTask: (taskId) => set((s) => ({ timers: s.timers.filter((x) => x.taskId !== taskId) })),
  clear: () => set({ timers: [] }),
  tick: () => set({ now: Date.now() }),
}));

/** Live elapsed seconds for a timer given the store's ticking `now`. */
export function elapsedOf(t: RunningTimer, now: number): number {
  return Math.max(0, Math.floor((now - new Date(t.startedAt).getTime()) / 1000));
}

/** Combined elapsed across a set of timers. */
export function combinedElapsed(timers: RunningTimer[], now: number): number {
  return timers.reduce((s, t) => s + elapsedOf(t, now), 0);
}

/**
 * Fetch all running timers from the API and resolve their task title + project
 * (for the dropdown/cards). Tolerates the legacy single-object shape so a stale
 * server still works. Used by both shells to hydrate on boot and on WS events.
 */
export async function fetchRunningTimers(): Promise<RunningTimer[]> {
  const raw = await api<TimeEntry[] | TimeEntry | null>('/time-entries/running').catch(() => null);
  const list: TimeEntry[] = Array.isArray(raw) ? raw : raw && (raw as TimeEntry).id ? [raw as TimeEntry] : [];
  // Cache project lookups so concurrent timers on the same project hit once.
  const projCache = new Map<string, Project | null>();
  const project = async (id: string) => {
    if (!projCache.has(id)) projCache.set(id, await api<Project>(`/projects/${id}`).catch(() => null));
    return projCache.get(id) ?? null;
  };
  return Promise.all(list.map(async (e): Promise<RunningTimer> => {
    let taskTitle: string | null = null;
    let projectId: string | undefined;
    let projectColor: string | undefined;
    let projectName: string | null = null;
    if (e.taskId) {
      const task = await api<Task>(`/tasks/${e.taskId}`).catch(() => null);
      taskTitle = task?.title ?? null;
      if (task) {
        projectId = task.projectId;
        const proj = await project(task.projectId);
        projectColor = proj?.colorHex;
        projectName = proj?.name ?? null;
      }
    }
    return { entryId: e.id, taskId: e.taskId ?? null, taskTitle, projectId, projectColor, projectName, startedAt: e.startedAt };
  }));
}
