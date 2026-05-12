import Dexie, { type Table } from 'dexie';

export interface QueuedItem {
  id: string;            // client UUID — used for idempotent sync
  kind: 'TIME' | 'STATUS' | 'COMMENT' | 'TASK';
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

// Persisted cache of GET responses keyed by API path. Powers the
// stale-while-revalidate behaviour in useCachedApi.
export interface CachedResponse {
  key: string;   // e.g. "/projects?archived=all"
  data: unknown;
  ts: number;    // ms epoch — when the response was stored
}

// Legacy per-entity caches (kept so v1 → v2 migration doesn't drop anything).
export interface CachedProject { id: string; updatedAt: number; data: any; }
export interface CachedTask { id: string; projectId: string; updatedAt: number; data: any; }

export class LapseDB extends Dexie {
  queue!: Table<QueuedItem, string>;
  projects!: Table<CachedProject, string>;
  tasks!: Table<CachedTask, string>;
  responses!: Table<CachedResponse, string>;

  constructor() {
    super('lapse');
    this.version(1).stores({
      queue: 'id, kind, createdAt',
      projects: 'id, updatedAt',
      tasks: 'id, projectId, updatedAt',
    });
    // v2 adds the response cache.
    this.version(2).stores({
      queue: 'id, kind, createdAt',
      projects: 'id, updatedAt',
      tasks: 'id, projectId, updatedAt',
      responses: 'key, ts',
    });
  }
}

export const db = new LapseDB();
