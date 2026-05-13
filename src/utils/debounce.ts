import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable debounced wrapper around `fn`. The wrapped function takes
 * the same arguments and schedules a call after `delay` ms. Subsequent calls
 * within the window reset the timer.
 *
 * On unmount the pending invocation is dropped. Use `flush()` on the returned
 * object if you need to commit a pending change immediately (e.g. on blur).
 */
export function useDebouncedCallback<TArgs extends unknown[]>(fn: (...args: TArgs) => void, delay = 500) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<number | null>(null);
  const lastArgs = useRef<TArgs | null>(null);

  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current);
  }, []);

  const run = useCallback((...args: TArgs) => {
    lastArgs.current = args;
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (lastArgs.current) fnRef.current(...lastArgs.current);
    }, delay);
  }, [delay]);

  const flush = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
      if (lastArgs.current) fnRef.current(...lastArgs.current);
    }
  }, []);

  return Object.assign(run, { flush });
}
