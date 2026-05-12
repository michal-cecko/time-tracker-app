import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/ui/AppHeader';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import type { Project } from '@/api/types';
import { fmtHM } from '@/utils/format';
import { useNav } from '@/state/stack';

export function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
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
                <Icon.ChevronRight size={14} />
              </div>
            ))}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ height: 80 }} />
      </div>
    </>
  );
}
