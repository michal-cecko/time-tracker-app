import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';

interface CalendarProps {
  onSelectTask?: (id: string) => void;
}

function weekFor(anchor: Date) {
  const day = anchor.getDay() || 7;
  const from = new Date(anchor); from.setHours(0, 0, 0, 0); from.setDate(anchor.getDate() - (day - 1));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) { const d = new Date(from); d.setDate(from.getDate() + i); days.push(d); }
  const to = new Date(from); to.setDate(from.getDate() + 7);
  return { from, to, days };
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export function DesktopCalendar({ onSelectTask }: CalendarProps) {
  const [anchor, setAnchor] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const range = useMemo(() => weekFor(anchor), [anchor]);

  useEffect(() => {
    (async () => {
      const data = await api<TimeEntry[]>(`/time-entries?from=${range.from.toISOString()}&to=${range.to.toISOString()}`);
      setEntries(data);
    })();
  }, [anchor]);

  const todayKey = new Date().toDateString();
  const weekNumber = isoWeek(range.from);
  const subtitle = `${range.from.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(range.to.getTime() - 1).toLocaleDateString([], { month: 'short', day: 'numeric' })} · Week ${weekNumber}`;

  return (
    <div className="dt-page">
      <div className="dt-page-head">
        <div>
          <div className="dt-page-title">Calendar</div>
          <div className="dt-page-sub">{subtitle}</div>
        </div>
        <div className="dt-page-actions">
          <div className="dt-seg">
            <button
              className="dt-seg-btn"
              aria-label="Previous week"
              onClick={() => setAnchor((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })}
            ><Icon.ChevronLeft size={12} /></button>
            <button className="dt-seg-btn" onClick={() => setAnchor(new Date())}>Today</button>
            <button
              className="dt-seg-btn"
              aria-label="Next week"
              onClick={() => setAnchor((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })}
            ><Icon.ChevronRight size={12} /></button>
          </div>
        </div>
      </div>

      <div className="dt-cal">
        <div className="dt-cal-head">
          <div />
          {range.days.map((d) => {
            const today = d.toDateString() === todayKey;
            return (
              <div key={d.toISOString()} className={`dt-cal-daycol ${today ? 'today' : ''}`}>
                <div className="dt-cal-dn">{d.toLocaleDateString([], { weekday: 'short' })}</div>
                <div className="dt-cal-num mono">{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="dt-cal-grid">
          <div className="dt-cal-hours">
            {HOURS.map((h) => (
              <div key={h} className="dt-cal-hour">
                <span className="mono">{h}:00</span>
              </div>
            ))}
          </div>
          {range.days.map((d) => {
            const isToday = d.toDateString() === todayKey;
            const dayEntries = entries.filter((e) => new Date(e.startedAt).toDateString() === d.toDateString());
            const now = new Date();
            const nowOffset = isToday
              ? (now.getHours() + now.getMinutes() / 60 - HOURS[0]) * 48
              : null;
            return (
              <div key={d.toISOString()} className={`dt-cal-day ${isToday ? 'today' : ''}`}>
                {HOURS.map((h) => <div key={h} className="dt-cal-cell" />)}
                {nowOffset != null && nowOffset >= 0 && nowOffset <= HOURS.length * 48 && (
                  <div className="dt-cal-now" style={{ top: nowOffset }}>
                    <span className="dt-cal-now-dot" />
                  </div>
                )}
                {dayEntries.map((e) => {
                  const start = new Date(e.startedAt);
                  const end = e.endedAt ? new Date(e.endedAt) : new Date();
                  const sh = start.getHours() + start.getMinutes() / 60;
                  const eh = end.getHours() + end.getMinutes() / 60;
                  if (eh < HOURS[0] || sh > HOURS[HOURS.length - 1] + 1) return null;
                  const top = Math.max(0, (sh - HOURS[0]) * 48);
                  const height = Math.max(20, (Math.min(HOURS[HOURS.length - 1] + 1, eh) - Math.max(HOURS[0], sh)) * 48 - 2);
                  const c = e.task?.project?.colorHex ?? 'var(--accent)';
                  return (
                    <div
                      key={e.id}
                      className="dt-cal-evt"
                      style={{
                        top, height,
                        background: `color-mix(in oklab, ${c} 18%, var(--bg-elev))`,
                        borderLeft: `2px solid ${c}`,
                      }}
                      onClick={() => e.taskId && onSelectTask?.(e.taskId)}
                    >
                      <div className="dt-cal-evt-title">{e.task?.title ?? 'Unassigned'}</div>
                      <div className="dt-cal-evt-time mono">
                        {fmtClock(start)}–{e.endedAt ? fmtClock(end) : 'now'}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function fmtClock(d: Date) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
