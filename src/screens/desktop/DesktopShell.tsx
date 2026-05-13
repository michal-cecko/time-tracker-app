import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import { useRunning } from '@/state/running';
import type { Project, Task, TimeEntry } from '@/api/types';
import { fmtHM, fmtHMS, fmtHoursShort, fmtInitials } from '@/utils/format';
import { useAuth } from '@/auth/AuthContext';
import { DesktopToday } from './DesktopToday';
import { DesktopProjectDetail } from './DesktopProjectDetail';
import { DesktopCalendar } from './DesktopCalendar';
import { DesktopReports } from './DesktopReports';
import { DesktopHistory } from './DesktopHistory';
import { Inspector } from './Inspector';
import { CommandPalette } from './CommandPalette';
import { LogoMark } from '@/components/brand/Logo';

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
  const { running, elapsed, tick, setRunning } = useRunning();
  const { user, logout } = useAuth();

  const load = async () => setProjects(await api<Project[]>('/projects?archived=all'));

  // Hydrate the running-timer state on boot — fetches the open TimeEntry and
  // the task it belongs to so the title-bar pill and inspector can light up.
  const hydrateRunning = async () => {
    try {
      const entry = await api<TimeEntry | null>('/time-entries/running');
      if (!entry || !entry.id) { setRunning(null); return; }
      const task = await api<Task>(`/tasks/${entry.taskId}`).catch(() => null);
      setRunning({
        entryId: entry.id,
        taskId: entry.taskId,
        taskTitle: task?.title,
        startedAt: entry.startedAt,
      });
    } catch { /* unauthenticated or offline; ignore */ }
  };

  useEffect(() => {
    load();
    hydrateRunning();
    const offs = [
      onRealtime('project.upserted', load),
      onRealtime('project.deleted', load),
      onRealtime('timer.started', hydrateRunning),
      onRealtime('timer.stopped', () => setRunning(null)),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  // Auto-populate the inspector with the running task on boot (and whenever
  // it changes). The user can still click anything else to override.
  useEffect(() => {
    setSelectedTaskId((cur) => {
      if (cur) return cur;
      return running?.taskId ?? null;
    });
  }, [running?.taskId]);

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
  const totalTracked = projects.reduce((s, p) => s + p.trackedSeconds, 0);
  const todayCount = active.reduce((s, p) => s + p.openTaskCount, 0);
  const initials = fmtInitials(user?.name ?? user?.email ?? 'Lapse');

  const renderCenter = () => {
    switch (view.kind) {
      case 'today':    return <DesktopToday onSelectTask={setSelectedTaskId} onSelectProject={(id) => setView({ kind: 'project', id })} />;
      case 'project':  return <DesktopProjectDetail id={view.id} onSelectTask={setSelectedTaskId} onDeleted={() => setView({ kind: 'today' })} />;
      case 'calendar': return <DesktopCalendar />;
      case 'reports':  return <DesktopReports />;
      case 'history':  return <DesktopHistory onSelectTask={setSelectedTaskId} />;
    }
  };

  return (
    <div className="dt-shell app">
      <div className="dt-titlebar">
        <div className="dt-lights">
          <span className="dt-light close" />
          <span className="dt-light min" />
          <span className="dt-light max" />
        </div>
        <span className="dt-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LogoMark size={14} />
          Lapse
        </span>
        <div className="dt-titlebar-right">
          <button className={`dt-timer-pill ${running ? 'running' : 'idle'}`} onClick={() => running && setSelectedTaskId(running.taskId)}>
            {running ? (
              <>
                <span className="dt-tp-live" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                  {running.taskTitle ?? 'Tracking'}
                </span>
                <span className="dt-tp-time">{fmtHMS(elapsed)}</span>
                <span
                  className="dt-tp-stop"
                  onClick={async (e) => { e.stopPropagation(); await api('/time-entries/stop', { method: 'POST' }); }}
                  role="button"
                  aria-label="Pause timer"
                >
                  <Icon.Pause size={11} />
                </span>
              </>
            ) : <><Icon.Clock size={12} /> Idle</>}
          </button>
          <button className="dt-cmd-btn" onClick={() => setPaletteOpen(true)}>
            <Icon.Search size={12} /><span>Jump to…</span><kbd>⌘K</kbd>
          </button>
          <button className="dt-avatar" onClick={logout} title="Sign out">{initials}</button>
        </div>
      </div>

      <div className="dt-body">
        <aside className="dt-rail">
          <div className="dt-rail-section">
            <RailNav label="Today"    icon={<Icon.Home size={14} />}     active={view.kind === 'today'}    onClick={() => setView({ kind: 'today' })} badge={todayCount} />
            <RailNav label="Calendar" icon={<Icon.Calendar size={14} />} active={view.kind === 'calendar'} onClick={() => setView({ kind: 'calendar' })} />
            <RailNav label="Reports"  icon={<Icon.Chart size={14} />}    active={view.kind === 'reports'}  onClick={() => setView({ kind: 'reports' })} />
            <RailNav label="History"  icon={<Icon.History size={14} />}  active={view.kind === 'history'}  onClick={() => setView({ kind: 'history' })} />
          </div>

          <div className="dt-rail-head">
            <span>Projects</span>
            <button
              className="dt-ghost"
              aria-label="Add project"
              onClick={async () => {
                const name = prompt('Project name'); if (!name) return;
                await api('/projects', { method: 'POST', body: { name, initials: name.slice(0, 2).toUpperCase(), colorHex: '#ff7a45' } });
              }}
            ><Icon.Plus size={12} /></button>
          </div>
          <div className="dt-rail-section">
            {active.map((p) => (
              <button
                key={p.id}
                className={`dt-rail-item ${view.kind === 'project' && view.id === p.id ? 'active' : ''}`}
                onClick={() => setView({ kind: 'project', id: p.id })}
              >
                <span className="dt-swatch" style={{ background: p.colorHex }} />
                <span className="dt-truncate">{p.name}</span>
                <span className="dt-rail-meta mono">{fmtHoursShort(p.trackedSeconds)}</span>
              </button>
            ))}
          </div>

          {archived.length > 0 && (
            <>
              <button className="dt-rail-head" onClick={() => setShowArchived((v) => !v)} style={{ width: '100%', cursor: 'pointer' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {showArchived ? <Icon.ChevronDown size={10} /> : <Icon.ChevronRight size={10} />}
                  Archived
                </span>
                <span>{archived.length}</span>
              </button>
              {showArchived && (
                <div className="dt-rail-section">
                  {archived.map((p) => (
                    <button
                      key={p.id}
                      className="dt-rail-item archived"
                      onClick={() => setView({ kind: 'project', id: p.id })}
                    >
                      <span className="dt-swatch" style={{ background: p.colorHex, opacity: 0.5 }} />
                      <span className="dt-truncate">{p.name}</span>
                      <span className="dt-rail-meta mono">{fmtHoursShort(p.trackedSeconds)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>

        <main className="dt-center">
          <div className="dt-page">
            {renderCenter()}
          </div>
        </main>

        <aside className={`dt-inspector ${selectedTaskId ? '' : 'empty'}`}>
          <Inspector taskId={selectedTaskId} onClear={() => setSelectedTaskId(null)} />
        </aside>
      </div>

      <div className="dt-statusbar">
        <OnlineIndicator />
        <span className="dt-sep" />
        <span style={{ flex: 1 }} />
        <span className="mono">{fmtHM(totalTracked)} tracked</span>
        <span className="dt-sep" />
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

function RailNav({ label, icon, active, onClick, badge }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void; badge?: number }) {
  return (
    <button className={`dt-rail-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}<span className="dt-truncate">{label}</span>
      {badge != null && badge > 0 && <span className="dt-badge">{badge}</span>}
    </button>
  );
}

function OnlineIndicator() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: online ? 'var(--st-done)' : 'var(--st-return)',
      }} />
      {online ? 'Synced' : 'Offline'}
    </span>
  );
}
