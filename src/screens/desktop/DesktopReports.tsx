import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { WeeklyReport } from '@/api/types';
import { fmtHM } from '@/utils/format';

export function DesktopReports() {
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    (async () => setWeekly(await api<WeeklyReport>('/reports/weekly')))();
  }, []);

  if (!weekly) return <div className="dt-page" style={{ color: 'var(--text-3)' }}>Loading…</div>;

  const today = new Date().toISOString().slice(0, 10);
  const dailyMax = Math.max(...weekly.days.map((d) => d.total), 1);
  const projects = Object.entries(weekly.perProject)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => b.seconds - a.seconds);
  const maxP = Math.max(1, ...projects.map((p) => p.seconds));

  return (
    <div className="dt-page">
      <div className="dt-page-head">
        <div>
          <div className="dt-page-title">Reports</div>
          <div className="dt-page-sub">{weekly.from} — {weekly.to}</div>
        </div>
        <div className="dt-page-actions">
          <button className="dt-btn">7 days <Icon.ChevronDown size={12} /></button>
          <button className="dt-btn">All projects <Icon.ChevronDown size={12} /></button>
        </div>
      </div>

      <div className="dt-stat-row">
        <Stat label="Tracked" value={fmtHM(weekly.total)} />
        <Stat label="Days active" value={String(weekly.days.filter((d) => d.total > 0).length)} sub="this week" />
        <Stat label="Projects" value={String(projects.length)} sub="with activity" />
        <Stat label="Avg / day" value={fmtHM(Math.floor(weekly.total / 7))} sub="across 7 days" />
      </div>

      <div className="dt-cols-2" style={{ marginTop: 20 }}>
        <div className="dt-section">
          <div className="dt-section-head"><span>Daily</span></div>
          <div className="dt-week-chart">
            {weekly.days.map((d) => {
              const isCurrentDay = d.date === today;
              const hours = d.total / 3600;
              const heightPct = Math.max(2, (d.total / dailyMax) * 100);
              return (
                <div key={d.date} className={`dt-wc-col ${isCurrentDay ? 'today' : ''}`}>
                  <div className="dt-wc-total mono">{hours > 0 ? `${hours.toFixed(1)}h` : ''}</div>
                  <div className="dt-wc-bar-wrap">
                    <div
                      className="dt-wc-bar"
                      style={{
                        height: `${heightPct}%`,
                        background: isCurrentDay ? 'var(--accent)' : 'var(--text-3)',
                        opacity: isCurrentDay ? 1 : 0.55,
                      }}
                    />
                  </div>
                  <div className="dt-wc-day">{new Date(d.date + 'T00:00').toLocaleDateString([], { weekday: 'short' })}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="dt-section">
          <div className="dt-section-head"><span>By project</span></div>
          <div style={{ padding: '4px 14px 14px' }}>
            {projects.map((p) => (
              <div key={p.id} className="dt-proj-row">
                <span className="dt-swatch" style={{ background: p.colorHex }} />
                <span className="dt-truncate" style={{ flex: 1 }}>{p.name}</span>
                <span className="mono dt-muted" style={{ fontSize: 11, width: 64, textAlign: 'right' }}>
                  {(p.seconds / 3600).toFixed(1)}h
                </span>
                <div className="dt-proj-bar">
                  <div style={{ width: `${(p.seconds / maxP) * 100}%`, background: p.colorHex }} />
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>No tracked time this week.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, up }: { label: string; value: string; sub?: string; up?: boolean }) {
  return (
    <div className="dt-stat">
      <div className="dt-stat-label">{label}</div>
      <div className="dt-stat-value mono">{value}</div>
      {sub && <div className={`dt-stat-delta ${up ? 'up' : ''}`}>{sub}</div>}
    </div>
  );
}
