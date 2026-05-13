import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/Status';
import { api } from '@/api/client';
import { entries as entriesApi } from '@/api/mutations';
import { onRealtime } from '@/api/websocket';
import type { Project, Task, WeeklyReport } from '@/api/types';
import { fmtDue, fmtHM } from '@/utils/format';

interface Bucket { project: Project; task: Task; }

function isToday(d: string | null | undefined): boolean {
  if (!d) return false;
  return new Date(d).toDateString() === new Date().toDateString();
}

export function DesktopToday({
  onSelectTask,
  onSelectProject,
}: {
  onSelectTask: (id: string) => void;
  onSelectProject: (id: string) => void;
}) {
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
  const sub = (
    <>
      {now.toLocaleDateString([], { weekday: 'long' })} · {now.toLocaleDateString([], { month: 'short', day: 'numeric' })} · <span className="mono">{fmtHM(todayTracked)}</span> tracked
    </>
  );

  return (
    <div className="dt-page">
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

      <DesktopTaskColumn title="Up next · priority" count={urgent.length} accent>
        {urgent.map((b) => (
          <DesktopTaskRow
            key={b.task.id}
            task={b.task}
            project={b.project}
            onSelect={() => onSelectTask(b.task.id)}
            onSelectProject={() => onSelectProject(b.project.id)}
            onToggleTimer={async () => {
              if (b.task.running) await entriesApi.stopTimer();
              else await entriesApi.startTimer(b.task.id);
            }}
          />
        ))}
      </DesktopTaskColumn>

      <div style={{ height: 16 }} />

      <DesktopTaskColumn title="Also today" count={also.length}>
        {also.map((b) => (
          <DesktopTaskRow
            key={b.task.id}
            task={b.task}
            project={b.project}
            onSelect={() => onSelectTask(b.task.id)}
            onSelectProject={() => onSelectProject(b.project.id)}
            onToggleTimer={async () => {
              if (b.task.running) await entriesApi.stopTimer();
              else await entriesApi.startTimer(b.task.id);
            }}
          />
        ))}
      </DesktopTaskColumn>

      {weekly && (
        <div className="dt-section" style={{ marginTop: 22 }}>
          <div className="dt-section-head">
            <span>Last 7 days</span>
            <span className="mono dt-muted">{fmtHM(weekly.total)}</span>
          </div>
          <WeekChart weekly={weekly} />
        </div>
      )}
    </div>
  );
}

function DesktopTaskColumn({
  title, count, accent, children,
}: { title: string; count: number; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="dt-col">
      <div className="dt-col-head">
        <span className={accent ? 'dt-col-title accent' : 'dt-col-title'}>{title}</span>
        <span className="dt-col-count">{count}</span>
      </div>
      <div className="dt-col-body">{children}</div>
    </div>
  );
}

interface RowProps {
  task: Task;
  project: Project;
  onSelect: () => void;
  onSelectProject: () => void;
  onToggleTimer: () => Promise<void> | void;
}
function DesktopTaskRow({ task, project, onSelect, onSelectProject, onToggleTimer }: RowProps) {
  const isRunning = !!task.running;
  return (
    <div className={`dt-task ${isRunning ? 'running' : ''}`} onClick={onSelect}>
      <button className="dt-task-status" onClick={(e) => e.stopPropagation()} aria-label="Change status">
        <StatusDot status={task.status} />
      </button>
      <span className="dt-truncate dt-task-title">{task.title}</span>
      {task.urgent && <Icon.Flag size={11} className="dt-urgent-flag" />}
      <button className="dt-task-proj" onClick={(e) => { e.stopPropagation(); onSelectProject(); }}>
        <span className="dt-swatch" style={{ background: project.colorHex }} />
        <span>{project.initials}</span>
      </button>
      {task.dueDate && <span className="dt-task-due">{fmtDue(new Date(task.dueDate))}</span>}
      <span className="dt-task-time mono">
        {fmtHM(task.totalTime)}
        {task.totalEstimate ? <span className="dt-muted"> / {fmtHM(task.totalEstimate)}</span> : null}
      </span>
      <button
        className={`dt-task-play ${isRunning ? 'running' : ''}`}
        aria-label={isRunning ? 'Pause' : 'Play'}
        onClick={(e) => { e.stopPropagation(); void onToggleTimer(); }}
      >
        {isRunning ? <Icon.Pause size={11} /> : <Icon.Play size={10} />}
      </button>
    </div>
  );
}

function WeekChart({ weekly }: { weekly: WeeklyReport }) {
  const max = Math.max(...weekly.days.map((d) => d.total), 1);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="dt-week-chart">
      {weekly.days.map((d) => {
        const isCurrentDay = d.date === today;
        const hours = d.total / 3600;
        const heightPct = Math.max(2, (d.total / max) * 100);
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
  );
}
