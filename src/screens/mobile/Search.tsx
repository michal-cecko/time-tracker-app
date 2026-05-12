import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/Status';
import { api } from '@/api/client';
import type { Project, Task } from '@/api/types';
import { fmtHM } from '@/utils/format';
import { useNav } from '@/state/stack';

export function SearchScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Array<{ task: Task; project: Project }>>([]);
  const { push } = useNav();

  useEffect(() => {
    (async () => {
      const ps = await api<Project[]>('/projects?archived=all');
      setProjects(ps);
      const tasks: Array<{ task: Task; project: Project }> = [];
      await Promise.all(ps.map(async (p) => {
        const tree = await api<Task[]>(`/projects/${p.id}/tasks`);
        const walk = (t: Task) => { tasks.push({ task: t, project: p }); t.children.forEach(walk); };
        tree.forEach(walk);
      }));
      setAllTasks(tasks);
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const taskHits = useMemo(() => q ? allTasks.filter(({ task }) => task.title.toLowerCase().includes(q)).slice(0, 12) : [], [q, allTasks]);
  const projHits = useMemo(() => q ? projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6) : [], [q, projects]);

  const highlight = (s: string) => {
    if (!q) return s;
    const i = s.toLowerCase().indexOf(q);
    if (i < 0) return s;
    return <>{s.slice(0, i)}<mark style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}>{s.slice(i, i + q.length)}</mark>{s.slice(i + q.length)}</>;
  };

  return (
    <>
      <div className="app-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon.ChevronLeft /></button>
        <span className="spacer" />
      </div>
      <div className="section">
        <div className="card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Search size={16} />
          <input autoFocus placeholder="Tasks and projects" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, fontSize: 15 }} />
          {query && <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear"><Icon.X size={14} /></button>}
        </div>
      </div>
      <div className="scroll">
        {!q && (
          <div className="section">
            <div className="section-head"><span>Recent</span></div>
            <div className="card" style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>Start typing to search.</div>
          </div>
        )}
        {taskHits.length > 0 && (
          <div className="section">
            <div className="section-head"><span>Tasks</span><span className="count">{taskHits.length}</span></div>
            <div className="card">
              {taskHits.map(({ task, project }) => (
                <div key={task.id} className="task" onClick={() => push({ kind: 'task', id: task.id })}>
                  <StatusDot status={task.status} />
                  <div className="grow">
                    <div className="title-line">{highlight(task.title)}</div>
                    <div className="meta"><span>{project.name}</span><span className="sep" /><span className="mono">{fmtHM(task.totalTime)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {projHits.length > 0 && (
          <div className="section">
            <div className="section-head"><span>Projects</span><span className="count">{projHits.length}</span></div>
            <div className="card">
              {projHits.map((p) => (
                <div key={p.id} className="task" onClick={() => push({ kind: 'project', id: p.id })}>
                  <span className="swatch" style={{ ['--c' as any]: p.colorHex }}>{p.initials}</span>
                  <div className="grow"><div className="title-line">{highlight(p.name)}</div></div>
                  <span className="mono">{fmtHM(p.trackedSeconds)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ height: 80 }} />
      </div>
    </>
  );
}
