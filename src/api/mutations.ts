// Mutations facade — wraps the raw REST calls so callers don't sprinkle
// fetch paths through the codebase. Names mirror the prototype's mutations.jsx.
//
// All writes go through `mutate()` which:
//   1. Generates a stable Idempotency-Key.
//   2. Tries the live request first.
//   3. On OfflineError, queues the mutation in the Dexie outbox for replay.
//
// When queued offline, the returned value is the optimistic shape (when one
// is provided) so the UI can render immediately. The server response replaces
// it on reconnect via WS events and a fresh GET.

import { api } from './client';
import { mutate } from './mutate';
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
    const r = await mutate<Task>({ method: 'PATCH', path: `/tasks/${id}`, body: patch });
    await invalidateTaskCaches();
    return r.data;
  },

  remove: async (id: string) => {
    await mutate<void>({ method: 'DELETE', path: `/tasks/${id}` });
    await invalidateTaskCaches();
  },

  setStatus: async (id: string, status: Status) => {
    const r = await mutate<Task>({ method: 'POST', path: `/tasks/${id}/status`, body: { status } });
    await invalidateTaskCaches();
    return r.data;
  },

  move: async (id: string, dest: { kind: 'project'; projectId: string } | { kind: 'task'; taskId: string }) => {
    const body = dest.kind === 'project'
      ? { parentTaskId: null, projectId: dest.projectId }
      : { parentTaskId: dest.taskId };
    const r = await mutate<Task>({ method: 'PATCH', path: `/tasks/${id}`, body });
    await invalidateTaskCaches();
    return r.data;
  },

  duplicate: async (id: string) => {
    const r = await mutate<Task>({ method: 'POST', path: `/tasks/${id}/duplicate` });
    await invalidateTaskCaches();
    return r.data;
  },
};

// ─── Projects ───────────────────────────────────────────────────────────
export const projects = {
  create: async (data: { name: string; initials: string; colorHex: string }) => {
    const r = await mutate<Project>({ method: 'POST', path: '/projects', body: data });
    await clearCache('/projects');
    return r.data;
  },

  update: async (id: string, patch: Partial<{ name: string; initials: string; colorHex: string }>) => {
    const r = await mutate<Project>({ method: 'PATCH', path: `/projects/${id}`, body: patch });
    await clearCache('/projects');
    return r.data;
  },

  archive: async (id: string) => {
    const r = await mutate<Project>({ method: 'POST', path: `/projects/${id}/archive` });
    await clearCache('/projects');
    return r.data;
  },

  unarchive: async (id: string) => {
    const r = await mutate<Project>({ method: 'POST', path: `/projects/${id}/unarchive` });
    await clearCache('/projects');
    return r.data;
  },

  remove: async (id: string) => {
    await mutate<void>({ method: 'DELETE', path: `/projects/${id}` });
    await invalidateTaskCaches();
    await clearCache('/projects');
  },
};

// ─── Time entries ───────────────────────────────────────────────────────
export const entries = {
  // taskId is optional — pass null / empty string for an unassigned timer
  // that the user will categorise later.
  startTimer: async (taskId: string | null) => {
    const startedAt = new Date().toISOString();
    const body: Record<string, unknown> = { startedAt };
    if (taskId) body.taskId = taskId;
    const r = await mutate<TimeEntry>({
      method: 'POST',
      path: '/time-entries/start',
      body,
    });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return r.data;
  },

  stopTimer: async () => {
    const endedAt = new Date().toISOString();
    const r = await mutate<TimeEntry>({
      method: 'POST',
      path: '/time-entries/stop',
      body: { endedAt },
    });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return r.data;
  },

  createManual: async (
    taskId: string | null,
    startedAt: string,
    endedAt: string | null,
    note?: string,
    durationSeconds?: number,
  ) => {
    const body: Record<string, unknown> = { startedAt, endedAt, note, durationSeconds };
    if (taskId) body.taskId = taskId;
    const r = await mutate<TimeEntry>({
      method: 'POST',
      path: '/time-entries',
      body,
    });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return r.data;
  },

  update: async (id: string, patch: Partial<{ startedAt: string; endedAt: string | null; durationSeconds: number; note: string }>) => {
    const r = await mutate<TimeEntry>({ method: 'PATCH', path: `/time-entries/${id}`, body: patch });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
    return r.data;
  },

  remove: async (id: string) => {
    await mutate<void>({ method: 'DELETE', path: `/time-entries/${id}` });
    await clearCache('/time-entries');
    await clearCache('/tasks/');
  },
};

async function invalidateTaskCaches() {
  await Promise.all([clearCache('/tasks/'), clearCache('/projects/'), clearCache('/projects?')]);
}

// Some legacy callsites still import { api } from this module. Keep the export
// alive so they don't break.
export { api };
