// useCachedApi — stale-while-revalidate hook for GETs.
//
//   const { data, loading, error, refetch, fromCache } = useCachedApi<T>('/projects?archived=all');
//
// Behaviour:
//   - On mount, peek the in-memory cache and render its value instantly
//     (no flash of "Loading…"). Loading is true only when we have no
//     cached data at all.
//   - Asynchronously read Dexie too, in case the mem cache was cold
//     (cold-boot or page reload after restart).
//   - If online, kick off a background fetch and refresh the cache.
//     The hook re-renders when the fresh response arrives.
//   - If offline, keep the cached value as the source of truth.
//   - Subscribes to other callers writing the same key so a fetch in one
//     component refreshes the data in others.
//   - When the browser fires `online` we refetch.

import { useEffect, useRef, useState } from 'react';
import { api, isOffline, OfflineError } from './client';
import { peekCache, readCache, writeCache, subscribe } from './cache';

interface State<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
}

interface Options {
  /** Skip when null/undefined — the hook will not fetch and will return data: undefined. */
  enabled?: boolean;
}

export function useCachedApi<T>(path: string | null, opts: Options = {}) {
  const enabled = (opts.enabled ?? true) && !!path;

  const [state, setState] = useState<State<T>>(() => {
    const peeked = path ? peekCache<T>(path) : undefined;
    return {
      data: peeked,
      loading: enabled && peeked === undefined,
      error: null,
      fromCache: peeked !== undefined,
    };
  });

  const mounted = useRef(true);
  const inflight = useRef<Promise<void> | null>(null);

  const refetch = async () => {
    if (!enabled || !path) return;
    // Avoid duplicate concurrent fetches for the same key in the same hook.
    if (inflight.current) return inflight.current;
    inflight.current = (async () => {
      // Warm cache from Dexie if mem was cold.
      if (state.data === undefined) {
        const fromDisk = await readCache<T>(path);
        if (fromDisk !== undefined && mounted.current) {
          setState({ data: fromDisk, loading: !isOffline(), error: null, fromCache: true });
        }
      }
      if (isOffline()) {
        if (mounted.current) setState((s) => ({ ...s, loading: false }));
        return;
      }
      try {
        const fresh = await api<T>(path);
        await writeCache(path, fresh);
        if (mounted.current) setState({ data: fresh, loading: false, error: null, fromCache: false });
      } catch (e: any) {
        if (!mounted.current) return;
        if (e instanceof OfflineError) {
          setState((s) => ({ ...s, loading: false }));
        } else {
          setState((s) => ({ ...s, loading: false, error: e }));
        }
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  };

  useEffect(() => {
    mounted.current = true;

    refetch();

    // Other components writing this key should refresh us too.
    const offSub = path ? subscribe(path, (fresh) => {
      if (mounted.current) setState((s) => ({ ...s, data: fresh as T, fromCache: false }));
    }) : () => {};

    const onUp = () => refetch();
    window.addEventListener('online', onUp);

    return () => {
      mounted.current = false;
      offSub();
      window.removeEventListener('online', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);

  return { ...state, refetch };
}
