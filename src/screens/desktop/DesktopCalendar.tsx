import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';
import { fmtHM } from '@/utils/format';
import { Icon } from '@/components/ui/Icon';

function weekFor(anchor: Date) {
  const day = anchor.getDay() || 7;
  const from = new Date(anchor); from.setHours(0, 0, 0, 0); from.setDate(anchor.getDate() - (day - 1));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) { const d = new Date(from); d.setDate(from.getDate() + i); days.push(d); }
  const to = new Date(from); to.setDate(from.getDate() + 7);
  return { from, to, days };
}

export function DesktopCalendar() {
  const [anchor, setAnchor] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const range = useMemo(() => weekFor(anchor), [anchor]);

  useEffect(() => {
    (async () => {
      const data = await api<TimeEntry[]>(`/time-entries?from=${range.from.toISOString()}&to=${range.to.toISOString()}`);
      setEntries(data);
    })();
  }, [anchor]);

  const entriesFor = (d: Date) => entries.filter((e) => new Date(e.startedAt).toDateString() === d.toDateString());

  return (
    <>
      <div className="hstack" style={{ marginBottom: 16 }}>
        <button className="icon-btn" onClick={() => setAnchor((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })}><Icon.ChevronLeft /></button>
        <button className="btn" onClick={() => setAnchor(new Date())}>Today</button>
        <button className="icon-btn" onClick={() => setAnchor((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })}><Icon.ChevronRight /></button>
        <span className="spacer" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>{range.from.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          <div />
          {range.days.map((d) => {
            const today = d.toDateString() === new Date().toDateString();
            return (
              <div key={d.toISOString()} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid var(--border)', color: today ? 'var(--accent)' : 'var(--text-2)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.toLocaleDateString([], { weekday: 'short' })}</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', position: 'relative', minHeight: 12 * 48 }}>
          <div>
            {Array.from({ length: 12 }, (_, i) => 8 + i).map((h) => (
              <div key={h} style={{ height: 48, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)', padding: '2px 6px 0 0', textAlign: 'right' }}>{h}:00</div>
            ))}
          </div>
          {range.days.map((d, i) => (
            <div key={d.toISOString()} style={{ position: 'relative', borderLeft: '1px solid var(--border)' }}>
              {Array.from({ length: 12 }).map((_, h) => <div key={h} style={{ height: 48, borderTop: '1px solid var(--border)' }} />)}
              {entriesFor(d).map((e) => {
                const start = new Date(e.startedAt);
                const end = e.endedAt ? new Date(e.endedAt) : new Date();
                const sh = start.getHours() + start.getMinutes() / 60;
                const eh = end.getHours() + end.getMinutes() / 60;
                if (eh < 8 || sh > 20) return null;
                const top = Math.max(0, (sh - 8) * 48);
                const height = Math.max(20, (Math.min(20, eh) - Math.max(8, sh)) * 48);
                const c = e.task?.project?.colorHex ?? 'var(--accent)';
                return (
                  <div key={e.id} className="cal-event" style={{
                    position: 'absolute', left: 4, right: 4, top, height,
                    ['--c' as any]: c,
                  }}>
                    <div style={{ fontWeight: 600 }}>{e.task?.title}</div>
                    <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)' }}>{fmtHM(e.endedAt ? e.durationSeconds : Math.floor((Date.now() - start.getTime()) / 1000))}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
