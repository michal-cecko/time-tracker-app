import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RingProgress } from '@/components/ui/ProgressBar';
import { api } from '@/api/client';
import { useRunning } from '@/state/running';
import { fmtHMS, fmtHM } from '@/utils/format';

export function FocusScreen({ onClose }: { onClose: () => void }) {
  const { running, elapsed, tick, setRunning } = useRunning();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  if (!running) { setTimeout(onClose, 0); return null; }

  const stop = async () => {
    try { await api('/time-entries/stop', { method: 'POST' }); }
    finally { setRunning(null); onClose(); }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 60, display: 'flex', flexDirection: 'column', padding: '60px 24px 32px' }}>
      <div className="hstack">
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon.X /></button>
        <span className="spacer" />
        <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>FOCUS</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <div style={{ position: 'relative' }}>
          <RingProgress pct={50} size={260} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="mono" style={{ fontSize: 36, fontWeight: 600 }}>{fmtHMS(elapsed)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{fmtHM(elapsed)} so far</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{running.taskTitle ?? 'Running'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Started {new Date(running.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
        </div>
      </div>
      <div className="hstack" style={{ justifyContent: 'center', gap: 12 }}>
        <button className="btn lg" onClick={onClose}><Icon.Pause size={16} />Pause</button>
        <button className="btn primary lg" onClick={stop}><Icon.Stop size={16} />Stop</button>
      </div>
    </div>
  );
}
