import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/ui/AppHeader';
import { Icon } from '@/components/ui/Icon';
import { ActionSheet } from '@/components/ui/sheets/ActionSheet';
import { ConfirmSheet } from '@/components/ui/sheets/ConfirmSheet';
import { EditProjectSheet } from '@/components/ui/sheets/EditProjectSheet';
import { DeleteProjectModal } from '@/components/ui/DeleteProjectModal';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import { projects as projectsApi } from '@/api/mutations';
import type { Project } from '@/api/types';
import { fmtHM } from '@/utils/format';
import { useNav } from '@/state/stack';

export function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [actionsOn, setActionsOn] = useState<Project | null>(null);
  const [editOn, setEditOn] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { push } = useNav();

  const load = async () => setProjects(await api<Project[]>('/projects?archived=all'));
  useEffect(() => {
    load();
    const off = onRealtime('project.upserted', load);
    const off2 = onRealtime('project.deleted', load);
    return () => { off(); off2(); };
  }, []);

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  return (
    <>
      <AppHeader
        title="Projects"
        sub={`${active.length} active${archived.length ? ` · ${archived.length} archived` : ''}`}
        right={
          <>
            <button className="icon-btn" onClick={() => setCreateOpen(true)} aria-label="New project"><Icon.Plus /></button>
            <button className="icon-btn" onClick={() => push({ kind: 'search' })} aria-label="Search"><Icon.Search /></button>
            <button className="icon-btn" onClick={() => push({ kind: 'settings' })} aria-label="More"><Icon.More /></button>
          </>
        }
      />
      <div className="scroll">
        <div className="section">
          <div className="card">
            {active.map((p) => (
              <div key={p.id} className="task" onClick={() => push({ kind: 'project', id: p.id })} style={{ cursor: 'pointer' }}>
                <div className="project-tile" style={{ padding: 0, background: 'transparent', border: 0 }}>
                  <span className="swatch" style={{ ['--c' as any]: p.colorHex }}>{p.initials}</span>
                </div>
                <div className="grow">
                  <div className="title-line">{p.name}</div>
                  <div className="meta">{p.openTaskCount} open{p.openTaskCount === 1 ? '' : 's'}</div>
                </div>
                <span className="mono right" style={{ color: 'var(--text-2)', fontSize: 13 }}>{fmtHM(p.trackedSeconds)}</span>
                <button
                  className="icon-btn"
                  onClick={(e) => { e.stopPropagation(); setActionsOn(p); }}
                  aria-label="Project actions"
                ><Icon.More size={14} /></button>
              </div>
            ))}
            {active.length === 0 && (
              <div style={{ padding: 24, color: 'var(--text-3)', textAlign: 'center', fontSize: 13 }}>
                No active projects yet. <button className="auth-link" onClick={() => setCreateOpen(true)}>Create one</button>.
              </div>
            )}
          </div>
        </div>

        {archived.length > 0 && (
          <div className="section">
            <button
              className="section-head"
              style={{ width: '100%', background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer' }}
              onClick={() => setShowArchived((v) => !v)}
            >
              <span className="hstack">{showArchived ? <Icon.ChevronDown size={12} /> : <Icon.ChevronRight size={12} />} Archived</span>
              <span className="count">{archived.length}</span>
            </button>
            {showArchived && (
              <div className="card">
                {archived.map((p) => (
                  <div key={p.id} className="task" onClick={() => push({ kind: 'project', id: p.id })} style={{ cursor: 'pointer', opacity: 0.7 }}>
                    <span className="swatch" style={{ ['--c' as any]: p.colorHex, opacity: 0.6 }}>{p.initials}</span>
                    <div className="grow">
                      <div className="title-line">{p.name}</div>
                      <div className="meta">{p.archivedAt ? `Archived ${new Date(p.archivedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'Archived'}</div>
                    </div>
                    <span className="mono right" style={{ color: 'var(--text-3)', fontSize: 13 }}>{fmtHM(p.trackedSeconds)}</span>
                    <button
                      className="icon-btn"
                      onClick={(e) => { e.stopPropagation(); setActionsOn(p); }}
                      aria-label="Project actions"
                    ><Icon.More size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ height: 80 }} />
      </div>

      {actionsOn && (
        <ActionSheet
          title={actionsOn.name}
          subtitle="Project actions"
          actions={[
            { label: 'Edit', icon: <Icon.Edit size={14} />, onClick: () => setEditOn(actionsOn) },
            {
              label: actionsOn.archived ? 'Unarchive' : 'Archive',
              icon: <Icon.Archive size={14} />,
              onClick: async () => { try { actionsOn.archived ? await projectsApi.unarchive(actionsOn.id) : await projectsApi.archive(actionsOn.id); load(); } catch {} },
            },
            { label: 'Delete', danger: true, icon: <Icon.Trash size={14} />, onClick: () => setConfirmDelete(actionsOn) },
          ]}
          onClose={() => setActionsOn(null)}
        />
      )}

      {editOn && (
        <EditProjectSheet
          project={editOn}
          onClose={() => setEditOn(null)}
          onSaved={() => load()}
        />
      )}

      {createOpen && (
        <EditProjectSheet
          onClose={() => setCreateOpen(false)}
          onSaved={() => load()}
        />
      )}

      {confirmDelete && (
        <DeleteProjectModal
          project={{ id: confirmDelete.id, name: confirmDelete.name }}
          onClose={() => setConfirmDelete(null)}
          onDeleted={() => { setConfirmDelete(null); load(); }}
        />
      )}
    </>
  );
}
