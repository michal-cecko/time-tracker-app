// Mutations facade — wraps the raw REST calls so callers don't sprinkle
// fetch paths through the codebase. Names mirror the prototype's mutations.jsx.
// Each function returns the freshly-saved record (or void for deletes) and
// invalidates the relevant cache keys so any subscribed useCachedApi hooks
// pick up the change on next render.

import { api } from './client';
import { clearCache } from './cache';
import type {
  BillingMode, Project, Status, Task, TimeEntry,
} from './types';

// ─── Tasks ──────────────────────────────────────────────────────────────
export const tasks = {
  update: async (id: string, patch: Partial<{
    title: string;
    status: Status;
    urgent: boolean;
    estimateSeconds: number | null;
    billingMode: BillingMode;
    hourlyRateCents: number | null;
    taskPriceCents: number | null;
    dueDate: string | null;
    description: Record<string, unknown>;
    parentTaskId: string | null;
    projectId: string;
    position: number;
  }>) => {
    const t = await api<Task>(`/tasks/${id}`, { method: 'PATCH', body: patch });
    await invalidateTaskCaches();
    return t;
  },

  remove: async (id: string) => {
    await api<void>(`/tasks/${id}`, { method: 'DELETE' });
    await invalidateTaskCaches();
  },

  setStatus: async (id: string, status: Status) => {
    const t = await api<Task>(`/tasks/${id}/status`, { method: 'POST', body: { status } });
    await invalidateTaskCaches();
    return t;
  },

  // Move under a project (top-level) OR under another task. Backend cascades
  // descendants' projectId for cross-project moves.
  move: async (id: string, dest: { kind: 'project'; projectId: string } | { kind: 'task'; taskId: string }) => {
    let body: any;
    if (dest.kind === 'project') {
      body = { parentTaskId: null, projectId: dest.projectId };
    } else {
      body = { parentTaskId: dest.taskId };
    }
    const t = await api<Task>(`/tasks/${id}`, { method: 'PATCH', body });
    await invalidateTaskCaches();
    return t;
  },

  duplicate: async (id: string) => {
    const t = await api<Task>(`/tasks/${id}/duplicate`, { method: 'POST' });
    await invalidateTaskCaches();
    return t;
  },
};

// ─── Projects ───────────────────────────────────────────────────────────
export const projects = {
  create: async (data: { name: string; initials: string; colorHex: string }) => {
    const p = await api<Project>('/projects', { method: 'POST', body: data });
    await clearCache('/projects');
    return p;
  },

  update: async (id: string, patch: Partial<{ name: string; initials: string; colorHex: string }>) => {
    const p = await api<Project>(`/projects/${id}`, { method: 'PATCH', body: patch });
    await clearCache('/projects');
    return p;
  },

  archive: async (id: string) => {
    const p = await api<Project>(`/projects/${id}/archive`, { method: 'POST' });
    await clearCache('/projects');
    return p;
  },

  unarchive: async (id: string) => {
    const p = await api<Project>(`/projects/${id}/unarchive`, { method: 'POST' });
    await clearCache('/projects');
    return p;
  },

  remove: async (id: string) => {
    await api<void>(`/projects/${id}`, { method: 'DELETE' });
    await invalidateTaskCaches();
    await clearCache('/projects');
  },
};

// ─── Time entries ───────────────────────────────────────────────────────
export const entries = {
  startTimer: async (taskId: string) => {
    const e = await api<TimeEntry>('/time-entries/start', { method: 'POST', body: { taskId } });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return e;
  },

  stopTimer: async () => {
    const e = await api<TimeEntry>('/time-entries/stop', { method: 'POST' });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return e;
  },

  createManual: async (taskId: string, startedAt: string, endedAt: string | null, note?: string, durationSeconds?: number) => {
    const e = await api<TimeEntry>('/time-entries', {
      method: 'POST',
      body: { taskId, startedAt, endedAt, note, durationSeconds },
    });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return e;
  },

  update: async (id: string, patch: Partial<{ startedAt: string; endedAt: string | null; durationSeconds: number; note: string }>) => {
    const e = await api<TimeEntry>(`/time-entries/${id}`, { method: 'PATCH', body: patch });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return e;
  },

  remove: async (id: string) => {
    await api<void>(`/time-entries/${id}`, { method: 'DELETE' });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
  },
};

async function invalidateTaskCaches() {
  await Promise.all([clearCache('/tasks/'), clearCache('/projects/'), clearCache('/projects?')]);
}
