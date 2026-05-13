import { db, type OutboxItem } from './db';
import { api } from '@/api/client';

type Listener = () => void;
const listeners = new Set<Listener>();

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function notify() { for (const fn of listeners) fn(); }

/** Subscribe to outbox changes (count, attempts, etc.). Returns unsubscribe. */
export function onOutboxChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Number of items currently queued. */
export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}

/** Snapshot of the outbox (for debugging / settings UI). */
export async function listOutbox(): Promise<OutboxItem[]> {
  return db.outbox.orderBy('createdAt').toArray();
}

/**
 * Queue a mutation for replay. Caller should already have failed the live
 * attempt; this is the persistent fallback.
 */
export async function enqueueMutation(args: {
  method: OutboxItem['method'];
  path: string;
  body?: unknown;
  idempotencyKey?: string;
}): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: args.idempotencyKey ?? uuid(),
    method: args.method,
    path: args.path,
    body: args.body,
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.outbox.put(item);
  notify();
  if (navigator.onLine) void drain();
  return item;
}

let draining = false;

/**
 * Drain the outbox by replaying each item against its real endpoint with the
 * stored Idempotency-Key header. Safe to call repeatedly; serialised.
 */
export async function drain(): Promise<{ applied: number; failed: number }> {
  if (draining || !navigator.onLine) return { applied: 0, failed: 0 };
  draining = true;
  let applied = 0;
  let failed = 0;
  try {
    const items = await db.outbox.orderBy('createdAt').toArray();
    for (const item of items) {
      try {
        await api(item.path, {
          method: item.method,
          body: item.body,
          headers: { 'Idempotency-Key': item.id },
        });
        await db.outbox.delete(item.id);
        applied++;
      } catch (e: any) {
        const isNet = e?.name === 'TypeError' || /Failed to fetch|network|offline/i.test(String(e?.message ?? ''));
        if (isNet) {
          await db.outbox.update(item.id, {
            attempts: item.attempts + 1,
            lastError: e?.message ?? 'network',
          });
          failed++;
          break; // stop draining on net error so we don't hammer.
        }
        // Hard failure (4xx etc.). Mark attempts; keep in outbox for visibility.
        await db.outbox.update(item.id, {
          attempts: item.attempts + 1,
          lastError: e?.body?.error ?? e?.message ?? 'unknown',
        });
        failed++;
      }
    }
  } finally {
    draining = false;
    notify();
  }
  return { applied, failed };
}

/** Drop a failed item from the outbox (caller acknowledges and discards). */
export async function discardOutboxItem(id: string) {
  await db.outbox.delete(id);
  notify();
}

let loopStarted = false;
export function startDrainLoop() {
  if (loopStarted) return;
  loopStarted = true;
  window.addEventListener('online', () => { void drain(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) void drain();
  });
  setInterval(() => { if (navigator.onLine) void drain(); }, 30_000);
  if (navigator.onLine) void drain();
}
