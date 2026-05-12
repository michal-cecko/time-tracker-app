import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/Status';
import { api } from '@/api/client';
import type { Project, Task } from '@/api/types';
import { fmtHM } from '@/utils/format';

export function CommandPalette({
  onClose,
  onPickTask,
  onPickProject,
}: {
  onClose: () => void;
  onPickTask: (id: string) => void;
  onPickProject: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Array<{ task: Task; project: Project }>>([]);

  useEffect(() => {
    (async () => {
      const ps = await api<Project[]>('/projects?archived=false');
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
  const taskHits = useMemo(() => q ? allTasks.filter(({ task }) => task.title.toLowerCase().includes(q)).slice(0, 8) : [], [q, allTasks]);
  const projHits = useMemo(() => q ? projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 4) : [], [q, projects]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(4px)', zIndex: 60,
      display: 'flex', justifyContent: 'center', paddingTop: '15vh',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 'min(640px, 90vw)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}>
        <div className="hstack" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <Icon.Search size={16} />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jump to task or project…" style={{ flex: 1, fontSize: 14 }} />
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg-elev-2)', borderRadius: 4, padding: '1px 6px', color: 'var(--text-3)' }}>ESC</kbd>
        </div>
        <div style={{ overflowY: 'auto' }}>
          {!q && <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13 }}>Start typing to search tasks and projects.</div>}
          {taskHits.map(({ task, project }) => (
            <div key={task.id} className="task" onClick={() => onPickTask(task.id)}>
              <StatusDot status={task.status} />
              <div className="grow">
                <div className="title-line">{task.title}</div>
                <div className="meta">
                  <span className="hstack" style={{ gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: project.colorHex }} />{project.name}
                  </span>
                  <span className="sep" /><span className="mono">{fmtHM(task.totalTime)}</span>
                </div>
              </div>
            </div>
          ))}
          {projHits.map((p) => (
            <div key={p.id} className="task" onClick={() => onPickProject(p.id)}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: p.colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'rgba(0,0,0,0.78)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.initials}</span>
              <div className="grow"><div className="title-line">{p.name}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
