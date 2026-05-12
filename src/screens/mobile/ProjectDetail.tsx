import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NestedTaskRow } from '@/components/ui/TaskRow';
import { StatusPicker } from '@/components/ui/Status';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import type { Project, Task, Status } from '@/api/types';
import { fmtHM } from '@/utils/format';
import { useNav } from '@/state/stack';

export function ProjectDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState<{ taskId: string; status: Status } | null>(null);
  const { push } = useNav();

  const load = async () => {
    const [projects, tree] = await Promise.all([
      api<Project[]>(`/projects?archived=all`),
      api<Task[]>(`/projects/${id}/tasks`),
    ]);
    const p = projects.find((x) => x.id === id) ?? null;
    setProject(p);
    setTasks(tree);
  };
  useEffect(() => {
    load();
    const offs = [
      onRealtime('task.upserted', load),
      onRealtime('task.deleted', load),
      onRealtime('project.upserted', load),
    ];
    return () => offs.forEach((o) => o());
  }, [id]);

  const toggle = (tid: string) => setExpanded((s) => { const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });

  const archive = async () => {
    if (!project) return;
    await api(`/projects/${project.id}/${project.archived ? 'unarchive' : 'archive'}`, { method: 'POST' });
  };

  if (!project) return <div className="scroll" style={{ padding: 60 }}>Loading…</div>;

  return (
    <>
      <div className="app-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon.ChevronLeft /></button>
        <span className="hstack" style={{ gap: 10 }}>
          <span className="swatch" style={{
            width: 40, height: 40, borderRadius: 12, background: project.colorHex,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.78)',
            fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16,
          }}>{project.initials}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.1 }}>{project.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{project.openTaskCount} open</div>
          </div>
        </span>
        <span className="spacer" />
        <button className="icon-btn" onClick={archive} aria-label="Archive"><Icon.Archive /></button>
      </div>
      <div className="scroll">
        <div className="section">
          <div className="hstack" style={{ gap: 10 }}>
            <div className="card hi" style={{ padding: 14, flex: 1 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Tracked</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{fmtHM(project.trackedSeconds)}</div>
            </div>
            <div className="card hi" style={{ padding: 14, flex: 1 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Open</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{project.openTaskCount}</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>Tasks</span><span className="count">{tasks.length}</span></div>
          <div className="card">
            {tasks.map((t) => (
              <NestedTaskRow
                key={t.id}
                task={t}
                expanded={expanded}
                onToggle={toggle}
                onOpen={(tid) => push({ kind: 'task', id: tid })}
                onStatusClick={(tid) => {
                  const find = (ts: Task[]): Task | null => {
                    for (const x of ts) { if (x.id === tid) return x; const c = find(x.children); if (c) return c; } return null;
                  };
                  const t2 = find(tasks);
                  if (t2) setPicker({ taskId: t2.id, status: t2.status });
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ height: 120 }} />
      </div>

      {picker && (
        <StatusPicker
          current={picker.status}
          onPick={async (s) => {
            await api(`/tasks/${picker.taskId}/status`, { method: 'POST', body: { status: s } });
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
