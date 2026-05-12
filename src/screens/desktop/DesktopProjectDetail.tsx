import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NestedTaskRow } from '@/components/ui/TaskRow';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import type { Project, Task } from '@/api/types';
import { fmtHM } from '@/utils/format';

export function DesktopProjectDetail({ id, onSelectTask }: { id: string; onSelectTask: (id: string) => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    const [projects, tree] = await Promise.all([
      api<Project[]>('/projects?archived=all'),
      api<Task[]>(`/projects/${id}/tasks`),
    ]);
    setProject(projects.find((x) => x.id === id) ?? null);
    setTasks(tree);
  };
  useEffect(() => {
    load();
    const offs = [onRealtime('task.upserted', load), onRealtime('task.deleted', load), onRealtime('project.upserted', load)];
    return () => offs.forEach((o) => o());
  }, [id]);

  if (!project) return <div>Loading…</div>;

  const toggle = (tid: string) => setExpanded((s) => { const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });

  return (
    <>
      <div className="hstack" style={{ marginBottom: 16, alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 12, background: project.colorHex,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.78)',
          fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16,
        }}>{project.initials}</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{project.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{project.openTaskCount} open · {fmtHM(project.trackedSeconds)} tracked</div>
        </div>
        <span className="spacer" />
        <button className="btn" onClick={async () => { await api(`/projects/${project.id}/${project.archived ? 'unarchive' : 'archive'}`, { method: 'POST' }); }}><Icon.Archive size={14} />{project.archived ? 'Unarchive' : 'Archive'}</button>
        <button className="btn primary"><Icon.Plus size={14} />New task</button>
      </div>

      <div className="card">
        {tasks.map((t) => (
          <NestedTaskRow
            key={t.id}
            task={t}
            expanded={expanded}
            onToggle={toggle}
            onOpen={onSelectTask}
          />
        ))}
        {tasks.length === 0 && <div style={{ padding: 24, color: 'var(--text-3)' }}>No tasks yet.</div>}
      </div>
    </>
  );
}
