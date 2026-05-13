import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/ui/AppHeader';
import { Icon } from '@/components/ui/Icon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { api } from '@/api/client';
import type { TimeEntry, WeeklyReport } from '@/api/types';
import { fmtHM } from '@/utils/format';
import { useNav } from '@/state/stack';

export function ReportsScreen() {
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [recent, setRecent] = useState<TimeEntry[]>([]);
  const { push } = useNav();

  useEffect(() => {
    (async () => {
      const [w, r] = await Promise.all([
        api<WeeklyReport>('/reports/weekly'),
        api<TimeEntry[]>('/time-entries'),
      ]);
      setWeekly(w);
      setRecent(r.slice(0, 10));
    })();
  }, []);

  if (!weekly) return <div className="scroll" style={{ padding: 60 }}>Loading…</div>;

  const max = Math.max(...weekly.days.map((d) => d.total), 1);

  return (
    <>
      <AppHeader
        title="Reports"
        sub="Last 7 days"
        right={<button className="icon-btn" onClick={() => push({ kind: 'history' })} aria-label="History"><Icon.History /></button>}
      />
      <div className="scroll">
        <div className="section">
          <div className="card" style={{ padding: 18 }}>
            <div className="mono" style={{ fontSize: 36, fontWeight: 600 }}>{fmtHM(weekly.total)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>tracked</div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>By day</span></div>
          <div className="card" style={{ padding: '24px 14px 12px' }}>
            <div className="bars">
              {weekly.days.map((d) => {
                const today = d.date === new Date().toISOString().slice(0, 10);
                const h = Math.max(2, (d.total / max) * 100);
                const day = new Date(d.date + 'T00:00').toLocaleDateString([], { weekday: 'short' }).slice(0, 1);
                return (
                  <div key={d.date} className={`bar ${today ? 'today' : ''}`}>
                    <div className="total mono">{d.total ? fmtHM(d.total) : ''}</div>
                    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 1, height: `${h}%` }}>
                      {Object.entries(d.perProject).map(([pid, secs]) => (
                        <div key={pid} style={{
                          flex: secs,
                          background: weekly.perProject[pid]?.colorHex ?? 'var(--text-4)',
                          borderRadius: 2,
                        }} />
                      ))}
                    </div>
                    <div className="day">{day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>By project</span></div>
          <div className="card" style={{ padding: 12 }}>
            {Object.entries(weekly.perProject).sort((a, b) => b[1].seconds - a[1].seconds).map(([id, p]) => {
              const pct = (p.seconds / weekly.total) * 100;
              return (
                <div key={id} style={{ padding: '8px 4px' }}>
                  <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="hstack" style={{ gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: p.colorHex }} />
                      <span style={{ fontSize: 13 }}>{p.name}</span>
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmtHM(p.seconds)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-elev-2)', borderRadius: 999 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: p.colorHex, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>Recent sessions</span><span className="count">{recent.length}</span></div>
          <div className="card">
            {recent.map((e) => {
              return (
                <div key={e.id} className="task" style={{ minHeight: 48 }} onClick={() => push({ kind: 'task', id: e.taskId })}>
                  {!e.endedAt && <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                  <div className="grow" style={{ minWidth: 0 }}>
                    {e.task?.project ? (
                      <>
                        <div className="meta" style={{ marginBottom: 2 }}>
                          <Breadcrumbs
                            project={{ id: e.task.project.id, name: e.task.project.name, colorHex: e.task.project.colorHex }}
                            ancestors={e.task.ancestors}
                            onProject={(id) => push({ kind: 'project', id })}
                            onTask={(id) => push({ kind: 'task', id })}
                          />
                        </div>
                        <div className="title-line">{e.task.title}</div>
                      </>
                    ) : (
                      <div className="title-line">{e.task?.title ?? 'Entry'}</div>
                    )}
                    <div className="meta">
                      <span className="mono">{new Date(e.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {e.endedAt ? new Date(e.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'now'}</span>
                    </div>
                  </div>
                  <span className="mono">{fmtHM(e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000))}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ height: 120 }} />
      </div>
    </>
  );
}
