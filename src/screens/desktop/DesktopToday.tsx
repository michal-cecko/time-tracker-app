import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/Status';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import type { Project, Task, WeeklyReport } from '@/api/types';
import { fmtHM } from '@/utils/format';

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
    setAlso(open.filter(({ task }) => !task.urgent && (isToday(task.dueDate) || task.running)).slice(0, 10));
    setWeekly(await api<WeeklyReport>('/reports/weekly'));
  };

  useEffect(() => {
    load();
    const offs = [onRealtime('task.upserted', load), onRealtime('timer.started', load), onRealtime('timer.stopped', load)];
    return () => offs.forEach((o) => o());
  }, []);

  const now = new Date();
  const sub = `${now.toLocaleDateString([], { weekday: 'long' })} · ${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}${weekly ? ` · ${fmtHM(weekly.days.find((d) => d.date === now.toISOString().slice(0, 10))?.total ?? 0)} tracked` : ''}`;

  const Row = ({ b }: { b: Bucket }) => (
    <div className="task" onClick={() => onSelectTask(b.task.id)} style={{ cursor: 'pointer' }}>
      <StatusDot status={b.task.status} />
      <div className="grow">
        <div className="title-line">{b.task.title} <PriorityFlag urgent={b.task.urgent} /></div>
        <div className="meta">
          <span className="hstack" style={{ gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: b.project.colorHex }} /> {b.project.name}
          </span>
          {b.task.dueDate && <><span className="sep" /><span>{new Date(b.task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></>}
        </div>
      </div>
      <span className="mono" style={{ fontSize: 12 }}>{fmtHM(b.task.totalTime)}{b.task.totalEstimate ? ` / ${fmtHM(b.task.totalEstimate)}` : ''}</span>
      <button className="icon-btn" onClick={async (e) => { e.stopPropagation(); await api('/time-entries/start', { method: 'POST', body: { taskId: b.task.id } }); }} aria-label="Play">
        {b.task.running ? <Icon.Pause size={14} /> : <Icon.Play size={14} />}
      </button>
    </div>
  );

  return (
    <>
      <div className="hstack" style={{ marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Today</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{sub}</div>
        </div>
        <span className="spacer" />
        <button className="btn"><Icon.Filter size={14} />Filter</button>
        <button className="btn primary"><Icon.Plus size={14} />New task</button>
      </div>

      {urgent.length > 0 && (
        <div className="section" style={{ padding: 0, marginTop: 0, marginBottom: 20 }}>
          <div className="section-head" style={{ padding: '0 0 10px' }}>
            <span style={{ color: 'var(--pri-urgent)' }}>Up next · priority</span>
            <span className="count">{urgent.length}</span>
          </div>
          <div className="card">{urgent.map((b) => <Row key={b.task.id} b={b} />)}</div>
        </div>
      )}

      {also.length > 0 && (
        <div className="section" style={{ padding: 0, marginTop: 0, marginBottom: 28 }}>
          <div className="section-head" style={{ padding: '0 0 10px' }}>
            <span>Also today</span><span className="count">{also.length}</span>
          </div>
          <div className="card">{also.map((b) => <Row key={b.task.id} b={b} />)}</div>
        </div>
      )}

      {weekly && (
        <div className="section" style={{ padding: 0, marginTop: 0 }}>
          <div className="section-head" style={{ padding: '0 0 10px' }}>
            <span>Last 7 days</span><span className="count mono">{fmtHM(weekly.total)}</span>
          </div>
          <div className="card" style={{ padding: '28px 16px 14px' }}>
            <div className="bars">
              {weekly.days.map((d) => {
                const max = Math.max(...weekly.days.map((x) => x.total), 1);
                const today = d.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={d.date} className={`bar ${today ? 'today' : ''}`}>
                    <div className="total mono">{d.total ? fmtHM(d.total) : ''}</div>
                    <div className="seg" style={{ height: `${Math.max(2, (d.total / max) * 100)}%`, background: today ? 'var(--accent)' : 'var(--text-4)' }} />
                    <div className="day">{new Date(d.date + 'T00:00').toLocaleDateString([], { weekday: 'short' }).slice(0, 3)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
