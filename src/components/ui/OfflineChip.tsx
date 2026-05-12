import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function OfflineChip({ queued, onClick }: { queued: number; onClick?: () => void }) {
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
  if (online && queued === 0) return null;
  return (
    <button className="offline-chip" onClick={onClick}>
      {online ? <Icon.Cloud size={11} /> : <Icon.CloudOff size={11} />}
      {online ? `Syncing · ${queued}` : `Offline${queued ? ` · ${queued} queued` : ''}`}
    </button>
  );
}
