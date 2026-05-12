import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import { useRunning } from '@/state/running';
import type { Project, Task } from '@/api/types';
import { fmtHM, fmtHMS } from '@/utils/format';
import { useAuth } from '@/auth/AuthContext';
import { DesktopToday } from './DesktopToday';
import { DesktopProjectDetail } from './DesktopProjectDetail';
import { DesktopCalendar } from './DesktopCalendar';
import { DesktopReports } from './DesktopReports';
import { DesktopHistory } from './DesktopHistory';
import { Inspector } from './Inspector';
import { CommandPalette } from './CommandPalette';

export type DesktopView =
  | { kind: 'today' }
  | { kind: 'project'; id: string }
  | { kind: 'calendar' }
  | { kind: 'reports' }
  | { kind: 'history' };

export function DesktopShell() {
  const [view, setView] = useState<DesktopView>({ kind: 'today' });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { running, elapsed, tick } = useRunning();
  const { user, logout } = useAuth();

  const load = async () => setProjects(await api<Project[]>('/projects?archived=all'));
  useEffect(() => {
    load();
    const offs = [onRealtime('project.upserted', load), onRealtime('project.deleted', load)];
    return () => offs.forEach((o) => o());
  }, []);

  // Tick the running timer pill
  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  // ⌘K
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  const renderCenter = () => {
    switch (view.kind) {
      case 'today':    return <DesktopToday onSelectTask={setSelectedTaskId} onSelectProject={(id) => setView({ kind: 'project', id })} />;
      case 'project':  return <DesktopProjectDetail id={view.id} onSelectTask={setSelectedTaskId} />;
      case 'calendar': return <DesktopCalendar />;
      case 'reports':  return <DesktopReports />;
      case 'history':  return <DesktopHistory onSelectTask={setSelectedTaskId} />;
    }
  };

  return (
    <div className="dt-shell">
      <div className="dt-titlebar">
        <div className="dt-lights">
          <span className="dt-light close" />
          <span className="dt-light min" />
          <span className="dt-light max" />
        </div>
        <span className="dt-title">Lapse — {user?.name}'s workspace</span>
        <div className="dt-titlebar-right">
          <button className={`dt-timer-pill ${running ? 'running' : 'idle'}`}>
            {running ? (
              <>
                <span className="dt-tp-live" />
                <span className="mono dt-tp-time">{fmtHMS(elapsed)}</span>
                <span className="dt-tp-stop" onClick={async (e) => { e.stopPropagation(); await api('/time-entries/stop', { method: 'POST' }); }}>
                  <Icon.Stop size={11} />
                </span>
              </>
            ) : <><Icon.Clock size={12} /> Idle</>}
          </button>
          <button className="dt-cmd-btn" onClick={() => setPaletteOpen(true)}>
            <Icon.Search size={12} /><span>Jump to…</span><kbd>⌘K</kbd>
          </button>
          <button className="dt-avatar" onClick={logout} title="Sign out">{user?.avatarSeed}</button>
        </div>
      </div>

      <div className="dt-body">
        <aside className="dt-rail">
          <NavBtn label="Today"    icon={<Icon.Home size={14} />}     active={view.kind === 'today'}    onClick={() => setView({ kind: 'today' })} />
          <NavBtn label="Calendar" icon={<Icon.Calendar size={14} />} active={view.kind === 'calendar'} onClick={() => setView({ kind: 'calendar' })} />
          <NavBtn label="Reports"  icon={<Icon.Chart size={14} />}    active={view.kind === 'reports'}  onClick={() => setView({ kind: 'reports' })} />
          <NavBtn label="History"  icon={<Icon.History size={14} />}  active={view.kind === 'history'}  onClick={() => setView({ kind: 'history' })} />

          <div className="dt-rail-head" style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Projects</span>
            <button onClick={async () => {
              const name = prompt('Project name'); if (!name) return;
              await api('/projects', { method: 'POST', body: { name, initials: name.slice(0, 2).toUpperCase(), colorHex: '#ff7a45' } });
            }} aria-label="Add project" className="icon-btn" style={{ width: 22, height: 22, borderRadius: 6 }}><Icon.Plus size={11} /></button>
          </div>
          {active.map((p) => (
            <button key={p.id} className={`dt-proj ${view.kind === 'project' && view.id === p.id ? 'active' : ''}`} onClick={() => setView({ kind: 'project', id: p.id })}>
              <span className="dt-proj-swatch" style={{ background: p.colorHex }} />
              <span className="dt-proj-name">{p.name}</span>
              <span className="mono dt-proj-time">{fmtHM(p.trackedSeconds)}</span>
            </button>
          ))}

          {archived.length > 0 && (
            <>
              <button className="dt-rail-head" onClick={() => setShowArchived((v) => !v)} style={{ background: 'transparent', border: 0, color: 'var(--text-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {showArchived ? <Icon.ChevronDown size={10} /> : <Icon.ChevronRight size={10} />}
                Archived · {archived.length}
              </button>
              {showArchived && archived.map((p) => (
                <button key={p.id} className="dt-proj" style={{ opacity: 0.6 }} onClick={() => setView({ kind: 'project', id: p.id })}>
                  <span className="dt-proj-swatch" style={{ background: p.colorHex, opacity: 0.6 }} />
                  <span className="dt-proj-name">{p.name}</span>
                  <span className="mono dt-proj-time">{fmtHM(p.trackedSeconds)}</span>
                </button>
              ))}
            </>
          )}
        </aside>

        <main className="dt-center" style={{ overflowY: 'auto' }}>
          <div className="dt-center-inner" style={{ maxWidth: 920, margin: '0 auto', padding: '24px 32px 60px' }}>
            {renderCenter()}
          </div>
        </main>

        <aside className="dt-inspector" style={{ overflowY: 'auto' }}>
          <Inspector taskId={selectedTaskId} onClear={() => setSelectedTaskId(null)} />
        </aside>
      </div>

      <div className="dt-statusbar" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)', gap: 12 }}>
        <span className="hstack" style={{ gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--st-done)' }} /> Synced
        </span>
        <span style={{ flex: 1 }} />
        <span className="mono">{fmtHM(active.reduce((s, p) => s + p.trackedSeconds, 0))}</span>
        <span>·</span>
        <span>v0.1.0 · {user?.email}</span>
      </div>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onPickTask={(id) => { setSelectedTaskId(id); setPaletteOpen(false); }}
          onPickProject={(id) => { setView({ kind: 'project', id }); setPaletteOpen(false); }}
        />
      )}
    </div>
  );
}

function NavBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
      borderRadius: 8, background: active ? 'var(--bg-elev)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-2)',
      fontSize: 13, fontWeight: 500, width: '100%', textAlign: 'left',
    }}>
      {icon}<span>{label}</span>
    </button>
  );
}
