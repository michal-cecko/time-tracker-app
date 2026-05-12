import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { TimeEntry, WeeklyReport } from '@/api/types';
import { fmtHM, fmtMoneyCents } from '@/utils/format';

export function DesktopReports() {
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    (async () => {
      setWeekly(await api('/reports/weekly'));
      setEntries(await api('/time-entries'));
    })();
  }, []);

  if (!weekly) return <div>Loading…</div>;

  const max = Math.max(...weekly.days.map((d) => d.total), 1);

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Reports</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 24 }}>Last 7 days · {weekly.from} → {weekly.to}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <Stat label="Tracked" value={fmtHM(weekly.total)} />
        <Stat label="Sessions" value={String(entries.length)} />
        <Stat label="Projects" value={String(Object.keys(weekly.perProject).length)} />
        <Stat label="Avg session" value={fmtHM(entries.length ? Math.round(weekly.total / entries.length) : 0)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Daily</div>
          <div className="bars">
            {weekly.days.map((d) => {
              const today = d.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={d.date} className={`bar ${today ? 'today' : ''}`}>
                  <div className="total mono">{d.total ? fmtHM(d.total) : ''}</div>
                  <div style={{ display: 'flex', flexDirection: 'column-reverse', height: `${Math.max(2, (d.total / max) * 100)}%`, gap: 1 }}>
                    {Object.entries(d.perProject).map(([pid, secs]) => (
                      <div key={pid} style={{ flex: secs, background: weekly.perProject[pid]?.colorHex ?? 'var(--text-4)', borderRadius: 2 }} />
                    ))}
                  </div>
                  <div className="day">{new Date(d.date + 'T00:00').toLocaleDateString([], { weekday: 'short' }).slice(0, 1)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>By project</div>
          {Object.entries(weekly.perProject).sort((a, b) => b[1].seconds - a[1].seconds).map(([id, p]) => {
            const pct = (p.seconds / weekly.total) * 100;
            return (
              <div key={id} style={{ padding: '8px 0' }}>
                <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="hstack" style={{ gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: p.colorHex }} />
                    <span style={{ fontSize: 13 }}>{p.name}</span>
                  </span>
                  <span className="mono">{fmtHM(p.seconds)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-elev-2)', borderRadius: 999 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: p.colorHex, borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }}>{value}</div>
    </div>
  );
}
