import { useEffect, useState } from 'react';
import { Icon } from '../Icon';
import { StatusDot } from '../Status';
import { api } from '@/api/client';
import { tasks as tasksApi } from '@/api/mutations';
import type { Project, Task } from '@/api/types';

interface Props {
  task: Task;
  onClose: () => void;
  onMoved?: () => void;
}

// Tree picker mirroring sheets.jsx > MoveTaskSheet. Active projects expand
// into their task trees; user picks the new container.
//   - Tap a project (top of each section) → task becomes top-level there.
//   - Tap a task → becomes its subtask.
// Self + descendants are disabled. Current parent gets a "HERE" badge.
export function MoveTaskSheet({ task, onClose, onMoved }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [byProject, setByProject] = useState<Record<string, Task[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set([task.projectId]));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ps = await api<Project[]>('/projects?archived=false').catch(() => [] as Project[]);
      setProjects(ps);
      const trees = await Promise.all(
        ps.map((p) => api<Task[]>(`/projects/${p.id}/tasks`).catch(() => [] as Task[])),
      );
      const map: Record<string, Task[]> = {};
      ps.forEach((p, i) => { map[p.id] = trees[i] ?? []; });
      setByProject(map);
    })();
  }, []);

  // Compute the descendant + self id set so they can't be picked as the new parent.
  const blocked = new Set<string>();
  const walkBlocked = (t: Task) => { blocked.add(t.id); t.children?.forEach(walkBlocked); };
  walkBlocked(task);
  const currentParentId = task.parentTaskId;

  const toggle = (id: string) => setExpanded((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const choose = async (dest: { kind: 'project'; projectId: string } | { kind: 'task'; taskId: string }) => {
    if (busy) return;
    setBusy(true);
    try {
      await tasksApi.move(task.id, dest);
      onMoved?.();
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{
        paddingBottom: 24, maxHeight: '80%', display: 'flex', flexDirection: 'column',
      }}>
        <div className="sheet-grab" />
        <div style={{ padding: '4px 20px 12px' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Move task</div>
          <div style={{
            fontSize: 12, color: 'var(--text-3)', marginTop: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{task.title}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {projects.map((p) => {
            const open = expanded.has(p.id);
            const tasksHere = byProject[p.id] ?? [];
            const isCurrent = p.id === task.projectId;
            return (
              <div key={p.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10 }}>
                  <button onClick={() => toggle(p.id)} style={{
                    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-3)', background: 'transparent', border: 'none',
                  }}>
                    {open ? <Icon.ChevronDown size={12} /> : <Icon.ChevronRight size={12} />}
                  </button>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6, background: p.colorHex,
                    fontSize: 10, fontFamily: 'var(--font-mono)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(0,0,0,0.85)', fontWeight: 600,
                  }}>{p.initials}</span>
                  <button
                    onClick={() => choose({ kind: 'project', projectId: p.id })}
                    disabled={busy}
                    style={{
                      flex: 1, textAlign: 'left', background: 'transparent', border: 'none',
                      color: 'var(--text)', fontSize: 14, fontWeight: 500, padding: '4px 0',
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {p.name}
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-4)', fontWeight: 400 }}>top level</span>
                  </button>
                  {isCurrent && currentParentId == null && (
                    <span style={{
                      fontSize: 10, color: 'var(--text-4)',
                      textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                    }}>here</span>
                  )}
                </div>
                {open && tasksHere.map((t) => (
                  <MoveNode
                    key={t.id} t={t} level={1} blocked={blocked} currentParentId={currentParentId}
                    expanded={expanded} toggle={toggle}
                    onPick={(id) => choose({ kind: 'task', taskId: id })}
                    busy={busy}
                  />
                ))}
                {open && tasksHere.length === 0 && (
                  <div style={{ padding: '6px 12px 6px 56px', fontSize: 11, color: 'var(--text-4)' }}>No tasks yet</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '8px 16px 0' }}>
          <button onClick={onClose} className="btn lg" style={{ width: '100%' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function MoveNode({
  t, level, blocked, currentParentId, expanded, toggle, onPick, busy,
}: {
  t: Task; level: number; blocked: Set<string>; currentParentId: string | null;
  expanded: Set<string>; toggle: (id: string) => void;
  onPick: (id: string) => void; busy: boolean;
}) {
  const isBlocked = blocked.has(t.id);
  const isHere = t.id === currentParentId;
  const hasChildren = (t.children?.length ?? 0) > 0;
  const open = expanded.has(t.id);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', paddingLeft: 12 + level * 18 }}>
        {hasChildren ? (
          <button onClick={() => toggle(t.id)} style={{
            width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-3)', background: 'transparent', border: 'none',
          }}>{open ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />}</button>
        ) : <span style={{ width: 18 }} />}
        <StatusDot status={t.status} size={12} />
        <button
          onClick={() => !isBlocked && !busy && onPick(t.id)}
          disabled={isBlocked || busy}
          style={{
            flex: 1, textAlign: 'left', background: 'transparent', border: 'none',
            color: isBlocked ? 'var(--text-4)' : 'var(--text-2)', fontSize: 13,
            padding: '2px 0',
            cursor: isBlocked || busy ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textDecoration: isBlocked && !isHere ? 'line-through' : 'none',
          }}
        >
          {t.title}
          {isHere && (
            <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>here</span>
          )}
          {isBlocked && !isHere && (
            <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-4)' }}>self</span>
          )}
        </button>
      </div>
      {open && (t.children ?? []).map((c) => (
        <MoveNode key={c.id} t={c} level={level + 1} blocked={blocked} currentParentId={currentParentId}
          expanded={expanded} toggle={toggle} onPick={onPick} busy={busy} />
      ))}
    </>
  );
}
