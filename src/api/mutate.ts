import { api, OfflineError } from './client';
import { enqueueMutation } from '@/offline/sync';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type Method = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface MutateResult<T> {
  /** true if the request landed online; false if it was queued for replay. */
  online: boolean;
  /** Server response (when online) OR the optimistic value (when queued).
   *  null when queued without an optimistic shape. */
  data: T | null;
  /** The Idempotency-Key used. Surfaced so callers can correlate with WS events. */
  idempotencyKey: string;
}

/**
 * Run a write that survives offline.
 *
 * - Generates an Idempotency-Key (stable across replays, so the server
 *   dedupes if the request actually landed twice).
 * - Tries the live request first.
 * - On OfflineError: enqueues the mutation in the Dexie outbox and returns
 *   the optimistic value (if provided), so the UI can render immediately.
 *
 * Non-network errors (4xx/5xx) propagate to the caller.
 */
export async function mutate<T = unknown>(args: {
  method: Method;
  path: string;
  body?: unknown;
  /** Optimistic value to return if we have to queue. */
  optimistic?: T;
  /** Pre-generated key. Pass this if you need it before the call (e.g. to
   *  stamp a temp local entity that you can later reconcile). */
  idempotencyKey?: string;
}): Promise<MutateResult<T>> {
  const key = args.idempotencyKey ?? uuid();
  try {
    const data = await api<T>(args.path, {
      method: args.method,
      body: args.body,
      headers: { 'Idempotency-Key': key },
    });
    return { online: true, data, idempotencyKey: key };
  } catch (e) {
    if (e instanceof OfflineError) {
      await enqueueMutation({ method: args.method, path: args.path, body: args.body, idempotencyKey: key });
      return { online: false, data: args.optimistic ?? null, idempotencyKey: key };
    }
    throw e;
  }
}
