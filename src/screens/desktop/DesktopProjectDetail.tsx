import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/Status';
import { DeleteProjectModal } from '@/components/ui/DeleteProjectModal';
import { EditProjectSheet } from '@/components/ui/sheets/EditProjectSheet';
import { RichEditor, type RichDoc } from '@/components/ui/RichEditor';
import { useDebouncedCallback } from '@/utils/debounce';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import { projects as projectsApi } from '@/api/mutations';
import { QuickAddSheet } from '@/screens/mobile/QuickAdd';
import type { Project, Task } from '@/api/types';
import { fmtHM } from '@/utils/format';

interface DesktopProjectDetailProps {
  id: string;
  onSelectTask: (id: string) => void;
  onDeleted?: () => void;
}

export function DesktopProjectDetail({ id, onSelectTask, onDeleted }: DesktopProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  const load = async () => {
    setProject(await api<Project>(`/projects/${id}`));
    setTasks(await api<Task[]>(`/projects/${id}/tasks`));
  };

  useEffect(() => {
    load();
    const offs = [onRealtime('task.upserted', load), onRealtime('project.upserted', load)];
    return () => offs.forEach((o) => o());
  }, [id]);

  if (!project) return <div className="dt-page" style={{ color: 'var(--text-3)' }}>Loading…</div>;

  const toggle = (taskId: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  const renderTask = (task: Task, level: number): React.ReactNode => {
    const open = expanded.has(task.id);
    const has = task.children && task.children.length > 0;
    return (
      <div key={task.id}>
        <div
          className="dt-task"
          style={{ paddingLeft: 12 + level * 16 }}
          onClick={() => onSelectTask(task.id)}
        >
          {has ? (
            <button
              className="dt-chev"
              onClick={(e) => { e.stopPropagation(); toggle(task.id); }}
              style={{ transform: open ? 'rotate(90deg)' : 'none' }}
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              <Icon.ChevronRight size={10} />
            </button>
          ) : <span className="dt-chev empty" />}
          <button className="dt-task-status" onClick={(e) => e.stopPropagation()} aria-label="Change status">
            <StatusDot status={task.status} />
          </button>
          <span className="dt-truncate dt-task-title">{task.title}</span>
          {task.urgent && <Icon.Flag size={11} />}
          {has && (
            <span className="dt-muted" style={{ fontSize: 11 }}>
              {task.children.length} sub
            </span>
          )}
          <span className="dt-task-time mono">
            {fmtHM(task.totalTime)}
            {task.totalEstimate ? <span className="dt-muted"> / {fmtHM(task.totalEstimate)}</span> : null}
          </span>
        </div>
        {open && has && task.children.map((c) => renderTask(c, level + 1))}
      </div>
    );
  };

  return (
    <div className="dt-page">
      <div className="dt-page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            className="dt-proj-bigswatch"
            style={{ background: project.colorHex, opacity: project.archived ? 0.6 : 1 }}
          >{project.initials}</span>
          <div>
            <div className="dt-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {project.name}
              {project.archived && (
                <span className="dt-chip" style={{ fontSize: 10, height: 18 }}>Archived</span>
              )}
            </div>
            <div className="dt-page-sub">
              {project.openTaskCount} open · <span className="mono">{fmtHM(project.trackedSeconds)}</span> tracked
            </div>
          </div>
        </div>
        <div className="dt-page-actions">
          {project.archived ? (
            <button
              className="dt-btn primary"
              onClick={async () => { await projectsApi.unarchive(project.id); load(); }}
            >Unarchive</button>
          ) : (
            <>
              <button className="dt-btn"><Icon.Filter size={12} /> Filter</button>
              <button className="dt-btn" onClick={() => setEditOpen(true)}><Icon.Edit size={12} /> Edit</button>
              <button
                className="dt-btn"
                onClick={async () => { await projectsApi.archive(project.id); load(); }}
              ><Icon.Archive size={12} /> Archive</button>
              <button
                className="dt-btn"
                style={{ color: 'var(--pri-urgent)' }}
                onClick={() => setConfirmDelete(true)}
              ><Icon.Trash size={12} /> Delete</button>
              <button className="dt-btn primary" onClick={() => setQuickAdd(true)}><Icon.Plus size={12} /> New task</button>
            </>
          )}
        </div>
      </div>

      <div className="dt-section">
        <div className="dt-section-head"><span>Description</span></div>
        <div style={{ padding: '0 14px 14px' }}>
          <ProjectDescriptionEditor
            project={project}
            onLocal={(doc) => setProject((p) => p ? { ...p, description: doc } : p)}
          />
        </div>
      </div>

      <div className="dt-section dt-table">
        <div className="dt-table-head">
          <span style={{ width: 16 }} />
          <span style={{ width: 16 }} />
          <span style={{ flex: 1 }}>Task</span>
          <span style={{ width: 130 }}>Time / estimate</span>
        </div>
        {tasks.map((t) => renderTask(t, 0))}
        {tasks.length === 0 && (
          <div style={{ padding: 24, color: 'var(--text-3)' }}>No tasks yet.</div>
        )}
      </div>

      {confirmDelete && (
        <DeleteProjectModal
          project={{ id: project.id, name: project.name }}
          onClose={() => setConfirmDelete(false)}
          onDeleted={() => { setConfirmDelete(false); onDeleted?.(); }}
        />
      )}
      {editOpen && (
        <EditProjectSheet
          project={project}
          onClose={() => setEditOpen(false)}
          onSaved={(p) => { setProject(p); setEditOpen(false); }}
        />
      )}
      {quickAdd && (
        <QuickAddSheet
          defaultProjectId={id}
          onClose={() => { setQuickAdd(false); load(); }}
        />
      )}
    </div>
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
