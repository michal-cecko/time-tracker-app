import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';
import { fmtHM } from '@/utils/format';

export function DesktopHistory({ onSelectTask }: { onSelectTask: (id: string) => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => { (async () => setEntries(await api('/time-entries')))(); }, []);

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>History</div>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px 100px', padding: '8px 14px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)', borderBottom: '1px solid var(--border)' }}>
          <span>When</span><span>Task</span><span>Project</span><span style={{ textAlign: 'right' }}>Duration</span>
        </div>
        {entries.map((e) => (
          <div key={e.id} onClick={() => onSelectTask(e.taskId)} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px 100px', padding: '10px 14px', borderBottom: '1px solid var(--line)', cursor: 'pointer', alignItems: 'center', fontSize: 13 }}>
            <span className="mono" style={{ color: 'var(--text-2)' }}>{new Date(e.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span>{e.task?.title}</span>
            <span style={{ color: 'var(--text-3)' }}>{e.task?.project?.name ?? ''}</span>
            <span className="mono right">{fmtHM(e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000))}</span>
          </div>
        ))}
        {entries.length === 0 && <div style={{ padding: 20, color: 'var(--text-3)' }}>No entries.</div>}
      </div>
    </>
  );
}
