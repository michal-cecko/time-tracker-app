import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useRunning, elapsedOf, combinedElapsed } from '@/state/running';
import { fmtHMS } from '@/utils/format';
import { entries as entriesApi } from '@/api/mutations';

/**
 * Floating timer bar above the tab bar. With a single running timer it shows
 * that timer inline; with several it collapses to a "N timers running ·
 * combined" header that expands into a per-timer list (each with its own
 * pause), matching the mobile multi-tracker design.
 */
export function MiniTimerBar({ onOpen }: { onOpen?: (taskId: string) => void }) {
  const { timers, now, tick, removeTimer } = useRunning();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (timers.length === 0) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timers.length, tick]);

  if (timers.length === 0) return null;

  const stop = async (entryId: string) => {
    removeTimer(entryId);
    try { await entriesApi.stopTimer(entryId); } catch { /* offline → optimistic state stays */ }
  };

  // Single timer — the original compact bar.
  if (timers.length === 1) {
    const t = timers[0];
    return (
      <div className="minibar">
        <span className="pulse" />
        <div className="grow" onClick={() => t.taskId && onOpen?.(t.taskId)} style={{ cursor: 'pointer', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.taskTitle ?? 'Running task'}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{fmtHMS(elapsedOf(t, now))}</div>
        </div>
        <button className="stop" onClick={() => stop(t.entryId)} aria-label="Stop timer">
          <Icon.Pause size={14} />
        </button>
      </div>
    );
  }

  // Multiple timers — collapsible header + per-timer list.
  return (
    <div className={`minibar multi ${expanded ? 'open' : ''}`}>
      <button className="minibar-head" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <span className="pulse" />
        <span className="minibar-count">{timers.length} timers running</span>
        <span className="mono minibar-combined">{fmtHMS(combinedElapsed(timers, now))}</span>
        <Icon.ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--text-3)' }} />
      </button>
      {expanded && (
        <div className="minibar-list">
          {timers.map((t) => (
            <div key={t.entryId} className="minibar-row">
              <span className="minibar-dot" style={{ background: t.projectColor ?? 'var(--accent)' }} />
              <div className="grow" onClick={() => t.taskId && onOpen?.(t.taskId)} style={{ cursor: 'pointer', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.taskTitle ?? 'Running task'}
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{fmtHMS(elapsedOf(t, now))}</div>
              </div>
              <button className="stop" onClick={() => stop(t.entryId)} aria-label={`Stop ${t.taskTitle ?? 'timer'}`}>
                <Icon.Pause size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
