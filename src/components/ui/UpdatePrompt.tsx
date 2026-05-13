import { useEffect, useState } from 'react';
import { isNative } from '@/utils/platform';

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // No service worker inside Capacitor/Tauri shells — assets ship with the bundle.
    if (isNative()) return;

    let cancelled = false;
    (async () => {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        const update = registerSW({
          onNeedRefresh() { if (!cancelled) setNeedRefresh(true); },
          onOfflineReady() { /* could show a "ready offline" toast */ },
        });
        if (!cancelled) setUpdateSW(() => update);
      } catch {
        // virtual module unavailable (dev build without devOptions.enabled)
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="pwa-toast" role="alert">
      <span>A new version is available.</span>
      <button
        type="button"
        className="pwa-toast-btn"
        onClick={() => updateSW?.(true)}
      >
        Reload
      </button>
      <button
        type="button"
        className="pwa-toast-dismiss"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
