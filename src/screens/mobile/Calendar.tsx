import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/ui/AppHeader';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';
import { fmtHM } from '@/utils/format';

function weekRange(anchor: Date): { from: Date; to: Date; days: Date[] } {
  const day = anchor.getDay() || 7;
  const from = new Date(anchor); from.setHours(0, 0, 0, 0); from.setDate(anchor.getDate() - (day - 1));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(from); d.setDate(from.getDate() + i); days.push(d);
  }
  const to = new Date(from); to.setDate(from.getDate() + 7);
  return { from, to, days };
}

function startOfMonth(anchor: Date) { const d = new Date(anchor); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }

export function CalendarScreen() {
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const range = useMemo(() => weekRange(anchor), [anchor]);

  const load = async () => {
    const from = view === 'week' ? range.from : startOfMonth(anchor);
    const to = view === 'week' ? range.to : new Date(from.getFullYear(), from.getMonth() + 1, 1);
    const data = await api<TimeEntry[]>(`/time-entries?from=${from.toISOString()}&to=${to.toISOString()}`);
    setEntries(data);
  };

  useEffect(() => { load(); }, [anchor, view]);

  const entriesForDay = (d: Date) => entries.filter((e) => new Date(e.startedAt).toDateString() === d.toDateString());

  return (
    <>
      <AppHeader
        title="Calendar"
        right={
          <>
            <button className="icon-btn" onClick={() => setAnchor(new Date())} aria-label="Today">{new Date().getDate()}</button>
          </>
        }
      />
      <div className="scroll">
        <div className="section">
          <div className="card" style={{ padding: 12 }}>
            <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <button className="icon-btn" onClick={() => setAnchor((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })} aria-label="Prev"><Icon.ChevronLeft /></button>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
                {anchor.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </div>
              <button className="icon-btn" onClick={() => setAnchor((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })} aria-label="Next"><Icon.ChevronRight /></button>
            </div>
            <div className="hstack" style={{ gap: 6 }}>
              {(['week', 'month'] as const).map((v) => (
                <button key={v} className="seg-btn" style={{ flex: 1, background: v === view ? 'var(--accent-tint)' : 'var(--bg-elev-2)', color: v === view ? 'var(--accent)' : 'var(--text-2)', height: 28 }} onClick={() => setView(v)}>{v === 'week' ? 'Week' : 'Month'}</button>
              ))}
            </div>
          </div>
        </div>

        {view === 'week' && (
          <>
            <div className="section">
              <div className="hstack" style={{ gap: 4 }}>
                {range.days.map((d) => {
                  const today = d.toDateString() === new Date().toDateString();
                  const selected = d.toDateString() === selectedDay.toDateString();
                  const total = entriesForDay(d).reduce((s, e) => s + (e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000)), 0);
                  return (
                    <button key={d.toISOString()} onClick={() => setSelectedDay(d)} className="card" style={{
                      flex: 1, padding: '8px 4px', textAlign: 'center',
                      background: selected ? 'var(--accent-tint)' : 'var(--card)',
                      borderColor: selected ? 'var(--accent-ring)' : 'var(--line)',
                    }}>
                      <div style={{ fontSize: 10, color: today ? 'var(--accent)' : 'var(--text-3)' }}>{d.toLocaleDateString([], { weekday: 'short' })[0]}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: today ? 'var(--accent)' : 'var(--text)' }}>{d.getDate()}</div>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--text-4)' }}>{total ? fmtHM(total) : ''}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="section">
              <div className="section-head"><span>{selectedDay.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
              <div className="card">
                <div className="cal-row" style={{ display: 'block', position: 'relative', minHeight: 12 * 48 }}>
                  {Array.from({ length: 12 }, (_, i) => 8 + i).map((h) => (
                    <div key={h} className="cal-cell" style={{ borderTop: '1px solid var(--line)', height: 48, position: 'relative' }}>
                      <span className="cal-time mono" style={{ position: 'absolute', left: 6, top: 2 }}>{h}:00</span>
                    </div>
                  ))}
                  {entriesForDay(selectedDay).map((e) => {
                    const start = new Date(e.startedAt);
                    const end = e.endedAt ? new Date(e.endedAt) : new Date();
                    const startHour = start.getHours() + start.getMinutes() / 60;
                    const endHour = end.getHours() + end.getMinutes() / 60;
                    if (startHour < 8 || endHour > 20) return null;
                    const top = (startHour - 8) * 48;
                    const height = Math.max(20, (endHour - startHour) * 48);
                    const color = e.task?.project?.colorHex ?? 'var(--accent)';
                    return (
                      <div key={e.id} className="cal-event" style={{
                        position: 'absolute', left: 40, right: 8, top, height,
                        ['--c' as any]: color,
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{e.task?.title ?? 'Entry'}</div>
                        <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)' }}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {e.endedAt ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'now'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {view === 'month' && (
          <div className="section">
            <div className="card" style={{ padding: 12 }}>
              <MonthHeatmap anchor={anchor} entries={entries} onPick={(d) => { setSelectedDay(d); setAnchor(d); setView('week'); }} />
            </div>
          </div>
        )}

        <div style={{ height: 120 }} />
      </div>
    </>
  );
}

function MonthHeatmap({ anchor, entries, onPick }: { anchor: Date; entries: TimeEntry[]; onPick: (d: Date) => void }) {
  const first = startOfMonth(anchor);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const totals = new Map<string, number>();
  for (const e of entries) {
    const key = new Date(e.startedAt).toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + (e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000)));
  }
  const maxSecs = Math.max(...totals.values(), 1);
  const cells: (Date | null)[] = [];
  const startWeekday = (first.getDay() + 6) % 7;
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const t = totals.get(d.toISOString().slice(0, 10)) ?? 0;
          const intensity = t / maxSecs;
          return (
            <button key={d.toISOString()} onClick={() => onPick(d)} style={{
              aspectRatio: '1',
              borderRadius: 6,
              background: t === 0 ? 'var(--bg-elev-2)' : `color-mix(in oklab, var(--accent) ${Math.round(intensity * 80)}%, var(--bg-elev-2))`,
              border: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
              padding: 4, color: t > 0 ? 'rgba(0,0,0,0.78)' : 'var(--text-3)',
              fontSize: 10, fontWeight: 600,
            }}>{d.getDate()}</button>
          );
        })}
      </div>
      <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>
        <span>Tracked: <span className="mono" style={{ color: 'var(--text)' }}>{fmtHM([...totals.values()].reduce((a, b) => a + b, 0))}</span></span>
        <span>Days worked: <span className="mono" style={{ color: 'var(--text)' }}>{[...totals.values()].filter((v) => v > 0).length}</span></span>
      </div>
    </>
  );
}
