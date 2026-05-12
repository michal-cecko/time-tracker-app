import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/Status';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import type { Project, Task, WeeklyReport } from '@/api/types';
import { fmtHM, fmtDue } from '@/utils/format';

interface Bucket { project: Project; task: Task; }

function isToday(d: string | null | undefined): boolean {
  if (!d) return false;
  return new Date(d).toDateString() === new Date().toDateString();
}

export function DesktopToday({ onSelectTask, onSelectProject }: { onSelectTask: (id: string) => void; onSelectProject: (id: string) => void }) {
  const [urgent, setUrgent] = useState<Bucket[]>([]);
  const [also, setAlso] = useState<Bucket[]>([]);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);

  const load = async () => {
    const projects = await api<Project[]>('/projects?archived=false');
    const trees = await Promise.all(projects.map((p) => api<Task[]>(`/projects/${p.id}/tasks`)));
    const all: Bucket[] = [];
    const walk = (t: Task, project: Project) => { all.push({ task: t, project }); t.children.forEach((c) => walk(c, project)); };
    trees.forEach((tree, i) => tree.forEach((t) => walk(t, projects[i])));
    const open = all.filter(({ task }) => !['DONE', 'INVOICED'].includes(task.status));
    setUrgent(open.filter(({ task }) => task.urgent));

    // "Also today" — strict: due today OR currently running. Fallback (when seed
    // data has no due dates): show in-progress / in-review work so the section
    // never collapses to nothing on a fresh install.
    const nonUrgent = open.filter(({ task }) => !task.urgent);
    const strict = nonUrgent.filter(({ task }) => isToday(task.dueDate) || task.running);
    const fallback = nonUrgent.filter(({ task }) => ['IN_PROGRESS', 'IN_REVIEW'].includes(task.status));
    setAlso((strict.length ? strict : fallback).slice(0, 10));
    setWeekly(await api<WeeklyReport>('/reports/weekly'));
  };

  useEffect(() => {
    load();
    const offs = [onRealtime('task.upserted', load), onRealtime('timer.started', load), onRealtime('timer.stopped', load)];
    return () => offs.forEach((o) => o());
  }, []);

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const todayTracked = weekly?.days.find((d) => d.date === todayKey)?.total ?? 0;
  const sub = `${now.toLocaleDateString([], { weekday: 'long' })} · ${now.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${fmtHM(todayTracked)} tracked`;

  const Row = ({ b }: { b: Bucket }) => (
    <div className={`dt-task ${b.task.running ? 'running' : ''}`} onClick={() => onSelectTask(b.task.id)}>
      <button
        className="dt-task-status"
        aria-label="Change status"
        onClick={(e) => { e.stopPropagation(); }}
      >
        <StatusDot status={b.task.status} />
      </button>
      <span className="dt-task-title">
        {b.task.title}
        <PriorityFlag urgent={b.task.urgent} />
      </span>
      <button
        className="dt-task-proj"
        onClick={(e) => { e.stopPropagation(); onSelectProject(b.project.id); }}
      >
        <span className="dt-swatch" style={{ background: b.project.colorHex }} />
        <span>{b.project.initials}</span>
      </button>
      {b.task.dueDate && (
        <span className="dt-task-due">{fmtDue(new Date(b.task.dueDate))}</span>
      )}
      <span className="dt-task-time mono">{fmtHM(b.task.totalTime)}{b.task.totalEstimate ? ` / ${fmtHM(b.task.totalEstimate)}` : ''}</span>
      <button
        className={`dt-task-play ${b.task.running ? 'running' : ''}`}
        aria-label={b.task.running ? 'Pause' : 'Play'}
        onClick={async (e) => {
          e.stopPropagation();
          if (b.task.running) await api('/time-entries/stop', { method: 'POST' });
          else await api('/time-entries/start', { method: 'POST', body: { taskId: b.task.id } });
        }}
      >
        {b.task.running ? <Icon.Pause size={12} /> : <Icon.Play size={12} />}
      </button>
    </div>
  );

  return (
    <>
      <div className="dt-page-head">
        <div>
          <div className="dt-page-title">Today</div>
          <div className="dt-page-sub">{sub}</div>
        </div>
        <div className="dt-page-actions">
          <button className="dt-btn"><Icon.Filter size={12} /> Filter</button>
          <button className="dt-btn primary"><Icon.Plus size={12} /> New task</button>
        </div>
      </div>

      {urgent.length > 0 && (
        <div className="dt-section">
          <div className="dt-section-head">
            <span className="dt-col-title accent">Up next · priority</span>
            <span className="dt-col-count">{urgent.length}</span>
          </div>
          <div className="dt-col-body">{urgent.map((b) => <Row key={b.task.id} b={b} />)}</div>
        </div>
      )}

      {also.length > 0 && (
        <div className="dt-section">
          <div className="dt-section-head">
            <span className="dt-col-title">Also today</span>
            <span className="dt-col-count">{also.length}</span>
          </div>
          <div className="dt-col-body">{also.map((b) => <Row key={b.task.id} b={b} />)}</div>
        </div>
      )}

      {weekly && <WeekChart weekly={weekly} />}
    </>
  );
}

function WeekChart({ weekly }: { weekly: WeeklyReport }) {
  const max = Math.max(...weekly.days.map((d) => d.total), 1);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="dt-section">
      <div className="dt-section-head">
        <span className="dt-col-title">Last 7 days</span>
        <span className="dt-col-count mono">{fmtHM(weekly.total)}</span>
      </div>
      <div className="dt-week-chart">
        {weekly.days.map((d) => {
          const isToday = d.date === today;
          const heightPct = Math.max(2, (d.total / max) * 100);
          return (
            <div key={d.date} className={`dt-wc-col ${isToday ? 'today' : ''}`}>
              <div className="dt-wc-total mono">{d.total ? fmtHM(d.total) : ''}</div>
              <div className="dt-wc-bar-wrap">
                <div
                  className="dt-wc-bar"
                  style={{
                    height: `${heightPct}%`,
                    background: isToday ? 'var(--accent)' : 'color-mix(in oklab, var(--text-4) 60%, transparent)',
                  }}
                />
              </div>
              <div className="dt-wc-day">{new Date(d.date + 'T00:00').toLocaleDateString([], { weekday: 'short' })}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
