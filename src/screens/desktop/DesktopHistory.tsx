import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';
import { fmtHM } from '@/utils/format';

export function DesktopHistory({ onSelectTask }: { onSelectTask: (id: string) => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => { (async () => setEntries(await api('/time-entries')))(); }, []);

  return (
    <div className="dt-page">
      <div className="dt-page-head">
        <div>
          <div className="dt-page-title">History</div>
          <div className="dt-page-sub">All time entries</div>
        </div>
        <div className="dt-page-actions">
          <button className="dt-btn"><Icon.Filter size={12} /> Filter</button>
          <button className="dt-btn primary"><Icon.Plus size={12} /> Manual entry</button>
        </div>
      </div>
      <div className="dt-section dt-table">
        <div className="dt-table-head">
          <span style={{ width: 100 }}>When</span>
          <span style={{ flex: 1 }}>Task</span>
          <span style={{ width: 140 }}>Project</span>
          <span style={{ width: 90, textAlign: 'right' }}>Duration</span>
        </div>
        {entries.map((e) => {
          const proj = e.task?.project;
          return (
            <div
              key={e.id}
              className="dt-task"
              onClick={() => e.taskId && onSelectTask(e.taskId)}
            >
              <span className="dt-muted mono" style={{ width: 100, fontSize: 11 }}>
                {new Date(e.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="dt-truncate" style={{ flex: 1 }}>{e.task?.title ?? 'Unassigned'}</span>
              <span style={{ width: 140, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                {proj && <span className="dt-swatch" style={{ background: proj.colorHex }} />}
                <span className="dt-muted dt-truncate">{proj?.name ?? '—'}</span>
              </span>
              <span className="mono" style={{ width: 90, textAlign: 'right' }}>
                {fmtHM(e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000))}
              </span>
            </div>
          );
        })}
        {entries.length === 0 && <div style={{ padding: 20, color: 'var(--text-3)' }}>No entries.</div>}
      </div>
    </div>
  );
}
