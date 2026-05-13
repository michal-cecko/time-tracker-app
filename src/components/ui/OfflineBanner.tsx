import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { onOutboxChange, pendingCount } from '@/offline/sync';

// Persistent top banner shown across every screen while the device is
// offline OR there are queued mutations awaiting replay. Sits above the
// app header (or desktop title bar) so the user always knows the app is
// serving cached data and mutations are queued.
export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const n = await pendingCount();
      if (!cancelled) setQueued(n);
    };
    refresh();
    const off = onOutboxChange(() => { void refresh(); });
    return () => { cancelled = true; off(); };
  }, []);

  if (online && queued === 0) return null;

  const label = !online
    ? (queued > 0
        ? `Offline — ${queued} change${queued === 1 ? '' : 's'} waiting to sync`
        : `Offline — changes will sync when you're back online`)
    : `Syncing ${queued} change${queued === 1 ? '' : 's'}…`;

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: online
          ? 'color-mix(in oklab, var(--accent) 80%, transparent)'
          : 'color-mix(in oklab, var(--st-return) 80%, transparent)',
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.01em',
        boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
      }}
    >
      <Icon.CloudOff size={13} />
      <span>{label}</span>
    </div>
  );
}
