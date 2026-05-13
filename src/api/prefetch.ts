// Cache-warmup. Called after login and whenever the network reconnects.
// Each call is fire-and-forget; we rely on api()'s write-through behaviour
// to fill the persistent IndexedDB cache so every screen has read-through
// data when the user goes offline.

import { api, isOffline } from './client';
import type { Project, Task } from './types';

function walk(t: Task, ids: Set<string>) {
  ids.add(t.id);
  for (const c of t.children ?? []) walk(c, ids);
}

let inflight: Promise<void> | null = null;

export async function prefetchAll(): Promise<void> {
  if (isOffline()) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      // Top-level reads — fast, cheap, and most screens depend on them.
      const [, projects] = await Promise.all([
        api('/me').catch(() => null),
        api<Project[]>('/projects?archived=all').catch(() => null),
        api('/reports/weekly').catch(() => null),
        api('/time-entries').catch(() => null),
        api('/time-entries/running').catch(() => null),
        api('/activity?limit=50').catch(() => null),
      ]);

      if (!projects) return;

      // For each project: its task tree.
      const trees = await Promise.all(
        projects.map((p) => api<Task[]>(`/projects/${p.id}/tasks`).catch(() => null)),
      );

      // Collect every task id (top-level + nested) so Inspector / TaskDetail
      // works offline for any task the user has ever seen online.
      const ids = new Set<string>();
      for (const tree of trees) {
        if (!tree) continue;
        for (const t of tree) walk(t, ids);
      }

      // Fan out per-task fetches. Batched in chunks so we don't overload the
      // browser's connection pool — Capacitor WebView is conservative.
      const all = [...ids];
      const chunkSize = 8;
      for (let i = 0; i < all.length; i += chunkSize) {
        if (isOffline()) break;
        const chunk = all.slice(i, i + chunkSize);
        await Promise.all(chunk.flatMap((id) => [
          api(`/tasks/${id}`).catch(() => null),
          api(`/tasks/${id}/time-entries?descendants=true`).catch(() => null),
        ]));
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
