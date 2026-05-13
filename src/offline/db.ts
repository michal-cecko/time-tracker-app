import Dexie, { type Table } from 'dexie';

// Outbox: queued REST mutations awaiting replay. Each item carries an
// Idempotency-Key so server-side replays are safe.
export interface OutboxItem {
  id: string;            // UUID — used as Idempotency-Key
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;          // e.g. "/time-entries/start"
  body?: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

// Persisted cache of GET responses keyed by API path. Powers the
// stale-while-revalidate behaviour and offline reads.
export interface CachedResponse {
  key: string;   // e.g. "/projects?archived=all"
  data: unknown;
  ts: number;    // ms epoch — when the response was stored
}

// Legacy per-entity caches (kept so v1 → v3 migration doesn't drop anything).
export interface CachedProject { id: string; updatedAt: number; data: any; }
export interface CachedTask { id: string; projectId: string; updatedAt: number; data: any; }

export class LapseDB extends Dexie {
  outbox!: Table<OutboxItem, string>;
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
    this.version(2).stores({
      queue: 'id, kind, createdAt',
      projects: 'id, updatedAt',
      tasks: 'id, projectId, updatedAt',
      responses: 'key, ts',
    });
    // v3: drop the legacy telemetry "queue" table; introduce the real REST outbox.
    this.version(3).stores({
      queue: null,
      outbox: 'id, createdAt',
      projects: 'id, updatedAt',
      tasks: 'id, projectId, updatedAt',
      responses: 'key, ts',
    });
  }
}

export const db = new LapseDB();
