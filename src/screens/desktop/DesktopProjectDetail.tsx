import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NestedTaskRow } from '@/components/ui/TaskRow';
import { DeleteProjectModal } from '@/components/ui/DeleteProjectModal';
import { EditProjectSheet } from '@/components/ui/sheets/EditProjectSheet';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import { projects as projectsApi } from '@/api/mutations';
import type { Project, Task } from '@/api/types';
import { fmtHM } from '@/utils/format';
import { RichEditor, type RichDoc } from '@/components/ui/RichEditor';
import { useDebouncedCallback } from '@/utils/debounce';

export function DesktopProjectDetail({
  id,
  onSelectTask,
  onDeleted,
}: {
  id: string;
  onSelectTask: (id: string) => void;
  onDeleted?: () => void;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
        <button className="btn" onClick={() => setEditOpen(true)}><Icon.Edit size={14} />Edit</button>
        <button className="btn" onClick={async () => { try { project.archived ? await projectsApi.unarchive(project.id) : await projectsApi.archive(project.id); load(); } catch {} }}><Icon.Archive size={14} />{project.archived ? 'Unarchive' : 'Archive'}</button>
        <button
          className="btn"
          onClick={() => setConfirmDelete(true)}
          style={{ color: 'var(--pri-urgent)', borderColor: 'color-mix(in oklab, var(--pri-urgent) 28%, var(--border))' }}
        >
          <Icon.Trash size={14} />Delete
        </button>
        <button className="btn primary"><Icon.Plus size={14} />New task</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Description</div>
        <ProjectDescriptionEditor project={project} onLocal={(doc) => setProject((p) => p ? { ...p, description: doc } : p)} />
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

      {confirmDelete && (
        <DeleteProjectModal
          project={{ id: project.id, name: project.name }}
          onClose={() => setConfirmDelete(false)}
          onDeleted={() => {
            setConfirmDelete(false);
            onDeleted?.();
          }}
        />
      )}

      {editOpen && (
        <EditProjectSheet
          project={project}
          onClose={() => setEditOpen(false)}
          onSaved={() => load()}
        />
      )}
    </>
  );
}

function ProjectDescriptionEditor({ project, onLocal }: { project: Project; onLocal: (doc: RichDoc) => void }) {
  const save = useDebouncedCallback((doc: RichDoc) => {
    void projectsApi.update(project.id, { description: doc as Record<string, unknown> });
  }, 600);
  return (
    <RichEditor
      value={(project.description as RichDoc | null) ?? null}
      placeholder="Add a description…"
      onChange={(doc) => { onLocal(doc); save(doc); }}
      compact
    />
  );
}
