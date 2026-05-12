import Dexie, { type Table } from 'dexie';

export interface QueuedItem {
  id: string;            // client UUID — used for idempotent sync
  kind: 'TIME' | 'STATUS' | 'COMMENT' | 'TASK';
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

// Read-side caches; minimal so they survive a quick offline session.
export interface CachedProject { id: string; updatedAt: number; data: any; }
export interface CachedTask { id: string; projectId: string; updatedAt: number; data: any; }

export class LapseDB extends Dexie {
  queue!: Table<QueuedItem, string>;
  projects!: Table<CachedProject, string>;
  tasks!: Table<CachedTask, string>;

  constructor() {
    super('lapse');
    this.version(1).stores({
      queue: 'id, kind, createdAt',
      projects: 'id, updatedAt',
      tasks: 'id, projectId, updatedAt',
    });
  }
}

export const db = new LapseDB();
