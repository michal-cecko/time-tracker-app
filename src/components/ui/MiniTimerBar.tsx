import { useEffect } from 'react';
import { Icon } from './Icon';
import { useRunning } from '@/state/running';
import { fmtHMS } from '@/utils/format';
import { api } from '@/api/client';

export function MiniTimerBar({ onOpen }: { onOpen?: (taskId: string) => void }) {
  const { running, elapsed, tick, setRunning } = useRunning();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  if (!running) return null;

  const stop = async () => {
    try {
      await api('/time-entries/stop', { method: 'POST' });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="minibar">
      <span className="pulse" />
      <div className="grow" onClick={() => running && onOpen?.(running.taskId)} style={{ cursor: 'pointer', minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {running.taskTitle ?? 'Running task'}
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{fmtHMS(elapsed)}</div>
      </div>
      <button className="stop" onClick={stop} aria-label="Stop timer">
        <Icon.Pause size={14} />
      </button>
    </div>
  );
}
