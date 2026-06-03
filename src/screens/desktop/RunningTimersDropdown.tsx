import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fmtHMS } from '@/utils/format';
import { elapsedOf, combinedElapsed, type RunningTimer } from '@/state/running';

interface Props {
  timers: RunningTimer[];
  now: number;
  onStop: (entryId: string) => void | Promise<void>;
  onSelectTask?: (taskId: string) => void;
  onTrackNew: () => void;
  onClose: () => void;
}

/**
 * Compact "running timers" popover anchored under the title-bar pill — the
 * desktop counterpart to the design's dropdown. Lists every concurrent timer
 * with its own elapsed + pause, plus the combined total. Distinct from
 * TimerPanel, which is the full "Track Time" composer (reachable via "Track
 * new" below).
 */
export function RunningTimersDropdown({ timers, now, onStop, onSelectTask, onTrackNew, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const combined = combinedElapsed(timers, now);

  return (
    <div className="rtd-panel" ref={rootRef} role="dialog" aria-label="Running timers">
      <header className="rtd-head">
        <div>
          <div className="rtd-title">{timers.length} timer{timers.length === 1 ? '' : 's'} running</div>
          <div className="rtd-sub mono">{fmtHMS(combined)} combined</div>
        </div>
        <button className="rtd-x" onClick={onClose} aria-label="Close"><Icon.X size={14} /></button>
      </header>

      <div className="rtd-list">
        {timers.map((t) => (
          <div key={t.entryId} className="rtd-row">
            <span className="rtd-dot" style={{ background: t.projectColor ?? 'var(--accent)' }} />
            <button
              className="rtd-main"
              onClick={() => t.taskId && onSelectTask?.(t.taskId)}
              disabled={!t.taskId}
            >
              <span className="rtd-name">{t.taskTitle ?? 'Unassigned timer'}</span>
              {t.projectName && <span className="rtd-proj">{t.projectName}</span>}
            </button>
            <span className="mono rtd-time">{fmtHMS(elapsedOf(t, now))}</span>
            <button
              className="rtd-pause"
              onClick={() => onStop(t.entryId)}
              aria-label={`Pause ${t.taskTitle ?? 'timer'}`}
            >
              <Icon.Pause size={13} />
            </button>
          </div>
        ))}
      </div>

      <footer className="rtd-foot">
        <span>Each tracker logs to its own task independently.</span>
        <button className="rtd-track-new" onClick={onTrackNew}>
          <Icon.Plus size={11} /> Track new
        </button>
      </footer>
    </div>
  );
}
