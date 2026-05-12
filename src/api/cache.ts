// Persistent + in-memory cache for GET responses, keyed by API path.
//
// - In-memory Map is synchronous and serves the hot path.
// - Dexie (IndexedDB) is the durable layer that survives navigation,
//   reloads, app restarts and Capacitor cold-boots.
// - There is no TTL; entries are only evicted on logout or explicit
//   clear. Stale data is fine — useCachedApi revalidates in the background.

import { db } from '@/offline/db';

type Entry = { data: unknown; ts: number };
const mem = new Map<string, Entry>();
const subscribers = new Map<string, Set<(data: unknown) => void>>();

/** Synchronous read from the in-memory mirror. */
export function peekCache<T>(key: string): T | undefined {
  return mem.get(key)?.data as T | undefined;
}

/** Async read — falls back to Dexie, then warms the memory mirror. */
export async function readCache<T>(key: string): Promise<T | undefined> {
  const m = mem.get(key);
  if (m) return m.data as T;
  try {
    const row = await db.responses.get(key);
    if (row) {
      mem.set(key, { data: row.data, ts: row.ts });
      return row.data as T;
    }
  } catch { /* db may not have opened yet */ }
  return undefined;
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  const ts = Date.now();
  mem.set(key, { data, ts });
  notify(key, data);
  try { await db.responses.put({ key, data, ts }); } catch {}
}

export async function clearCache(prefix?: string): Promise<void> {
  if (!prefix) {
    mem.clear();
    try { await db.responses.clear(); } catch {}
    return;
  }
  for (const k of [...mem.keys()]) if (k.startsWith(prefix)) mem.delete(k);
  try {
    const all = await db.responses.toArray();
    const drop = all.filter((r) => r.key.startsWith(prefix)).map((r) => r.key);
    if (drop.length) await db.responses.bulkDelete(drop);
  } catch {}
}

/** Lets useCachedApi subscribe to fresh writes for the same key. Used when
 *  the same data is fetched from multiple components simultaneously. */
export function subscribe(key: string, fn: (data: unknown) => void): () => void {
  let set = subscribers.get(key);
  if (!set) { set = new Set(); subscribers.set(key, set); }
  set.add(fn);
  return () => set!.delete(fn);
}

function notify(key: string, data: unknown) {
  subscribers.get(key)?.forEach((fn) => { try { fn(data); } catch {} });
}
