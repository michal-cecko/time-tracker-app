import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';
import { fmtClock, fmtHM, fmtRelative } from '@/utils/format';
import { useNav } from '@/state/stack';

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const { push } = useNav();

  useEffect(() => { (async () => setEntries(await api('/time-entries')))(); }, []);

  // Group by day
  const groups = new Map<string, { dayLabel: string; entries: TimeEntry[]; total: number }>();
  for (const e of entries) {
    const d = new Date(e.startedAt); d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const dayLabel = fmtRelative(d);
    const secs = e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000);
    if (!groups.has(key)) groups.set(key, { dayLabel, entries: [], total: 0 });
    const g = groups.get(key)!;
    g.entries.push(e);
    g.total += secs;
  }

  return (
    <>
      <div className="app-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon.ChevronLeft /></button>
        <div>
          <div className="title">History</div>
          <div className="sub">{entries.length} entries</div>
        </div>
        <span className="spacer" />
        <button className="icon-btn" onClick={() => push({ kind: 'manual' })} aria-label="Add"><Icon.Plus /></button>
      </div>
      <div className="scroll">
        {[...groups.entries()].map(([k, g]) => (
          <div key={k} className="section">
            <div className="section-head"><span>{g.dayLabel}</span><span className="count mono">{fmtHM(g.total)}</span></div>
            <div className="card">
              {g.entries.map((e) => (
                <div key={e.id} className="task" style={{ minHeight: 48 }} onClick={() => push({ kind: 'manual', entryId: e.id, taskId: e.taskId ?? undefined })}>
                  {!e.endedAt && <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                  <div className="grow">
                    <div className="title-line">{e.task?.title ?? 'Entry'}</div>
                    <div className="meta mono">{fmtClock(new Date(e.startedAt))} – {e.endedAt ? fmtClock(new Date(e.endedAt)) : 'now'}</div>
                  </div>
                  <span className="mono">{fmtHM(e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000))}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: 120 }} />
      </div>
    </>
  );
}
