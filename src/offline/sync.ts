import { db, type QueuedItem } from './db';
import { api } from '@/api/client';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function enqueue(item: Omit<QueuedItem, 'id' | 'createdAt' | 'attempts'> & { id?: string }) {
  const full: QueuedItem = {
    id: item.id ?? uuid(),
    kind: item.kind,
    payload: item.payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.queue.put(full);
  if (navigator.onLine) drain();
  return full.id;
}

export async function drain(): Promise<{ applied: string[]; skipped: string[] } | null> {
  if (!navigator.onLine) return null;
  const pending = await db.queue.toArray();
  if (pending.length === 0) return { applied: [], skipped: [] };
  try {
    const res = await api<{ applied: string[]; skipped: string[] }>('/sync/batch', {
      method: 'POST',
      body: { items: pending.map((p) => ({ id: p.id, kind: p.kind, payload: p.payload })) },
    });
    await db.queue.bulkDelete([...res.applied, ...res.skipped]);
    return res;
  } catch (e: any) {
    // bump attempts; let next reconnect retry
    await db.queue.toCollection().modify((p: QueuedItem) => { p.attempts += 1; p.lastError = e?.message; });
    return null;
  }
}

export function startDrainLoop() {
  window.addEventListener('online', () => { void drain(); });
  // Also try every 30s in case we missed an event.
  setInterval(() => { if (navigator.onLine) void drain(); }, 30_000);
}

export async function pendingCount(): Promise<number> {
  return db.queue.count();
}
