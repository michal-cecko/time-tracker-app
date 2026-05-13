import { useEffect, useState } from 'react';
import { Icon } from './Icon';

// Persistent top banner shown across every screen while the device is
// offline. Sits above the app header (or desktop title bar) so the user
// always knows the app is serving cached data and mutations are paused.
export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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

  if (online) return null;

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
        background: 'color-mix(in oklab, var(--st-return) 80%, transparent)',
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.01em',
        boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
      }}
    >
      <Icon.CloudOff size={13} />
      <span>Offline — changes will sync when you're back online</span>
    </div>
  );
}
