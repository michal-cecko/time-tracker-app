import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/brand/Logo';
import { api } from '@/api/client';
import { entries as entriesApi } from '@/api/mutations';
import { onRealtime } from '@/api/websocket';
import { useRunning, elapsedOf, fetchRunningTimers } from '@/state/running';
import { useAuth } from '@/auth/AuthContext';
import { platform } from '@/utils/platform';
import { fmtHM, fmtHMS, fmtHoursShort, fmtInitials } from '@/utils/format';
import type { Project } from '@/api/types';
import { RunningTimersDropdown } from './RunningTimersDropdown';
import { DesktopToday } from './DesktopToday';
import { DesktopProjectDetail } from './DesktopProjectDetail';
import { DesktopCalendar } from './DesktopCalendar';
import { DesktopReports } from './DesktopReports';
import { DesktopHistory } from './DesktopHistory';
import { Inspector } from './Inspector';
import { CommandPalette } from './CommandPalette';
import { TimerPanel } from './TimerPanel';
import { SettingsScreen } from '@/screens/mobile/Settings';

export type DesktopView =
  | { kind: 'today' }
  | { kind: 'project'; id: string }
  | { kind: 'calendar' }
  | { kind: 'reports' }
  | { kind: 'history' }
  | { kind: 'settings' };

interface NavItem { id: 'today' | 'calendar' | 'reports' | 'history'; label: string; icon: React.ReactNode }
const NAV: NavItem[] = [
  { id: 'today',    label: 'Today',    icon: <Icon.Home size={14} /> },
  { id: 'calendar', label: 'Calendar', icon: <Icon.Calendar size={14} /> },
  { id: 'reports',  label: 'Reports',  icon: <Icon.Chart size={14} /> },
  { id: 'history',  label: 'History',  icon: <Icon.History size={14} /> },
];

export function DesktopShell() {
  const isTauri = platform() === 'macos';
  const [view, setView] = useState<DesktopView>({ kind: 'today' });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [timerPanelOpen, setTimerPanelOpen] = useState(false);
  const [timersOpen, setTimersOpen] = useState(false);
  const { timers, now, tick, setTimers, removeTimer } = useRunning();
  const { user } = useAuth();

  const load = async () => setProjects(await api<Project[]>('/projects?archived=all'));

  const hydrateRunning = async () => {
    try { setTimers(await fetchRunningTimers()); } catch { /* unauthenticated or offline; ignore */ }
  };

  useEffect(() => {
    load();
    hydrateRunning();
    const offs = [
      onRealtime('project.upserted', load),
      onRealtime('project.deleted', load),
      onRealtime('timer.started', hydrateRunning),
      onRealtime('timer.stopped', (e: { entryId?: string }) => {
        if (e?.entryId) removeTimer(e.entryId); else hydrateRunning();
      }),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  useEffect(() => {
    if (timers.length === 0) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timers.length, tick]);

  const primary = timers[0] ?? null;
  useEffect(() => {
    setSelectedTaskId((cur) => cur ?? primary?.taskId ?? null);
  }, [primary?.taskId]);

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
  const initials = fmtInitials(user?.name ?? user?.email ?? 'Lapse');

  const renderCenter = () => {
    switch (view.kind) {
      case 'today':    return <DesktopToday onSelectTask={setSelectedTaskId} onSelectProject={(id) => setView({ kind: 'project', id })} />;
      case 'project':  return <DesktopProjectDetail id={view.id} onSelectTask={setSelectedTaskId} onDeleted={() => setView({ kind: 'today' })} />;
      case 'calendar': return <DesktopCalendar onSelectTask={setSelectedTaskId} />;
      case 'reports':  return <DesktopReports />;
      case 'history':  return <DesktopHistory onSelectTask={setSelectedTaskId} />;
      case 'settings': return (
        <div className="dt-settings-wrap">
          <SettingsScreen onBack={() => setView({ kind: 'today' })} />
        </div>
      );
    }
  };

  return (
    <div className={`dt-shell app ${isTauri ? 'tauri' : ''}`}>
      {/* TITLEBAR */}
      <div className="dt-titlebar" data-tauri-drag-region>
        <span className="dt-brand" data-tauri-drag-region>
          <LogoMark size={14} />
          <span>Lapse</span>
        </span>
        <div className="dt-titlebar-right" data-tauri-drag-region="false">
          <button className="dt-cmd-btn" onClick={() => setPaletteOpen(true)}>
            <Icon.Search size={12} />
            <span>Jump to…</span>
            <kbd>⌘K</kbd>
          </button>
          <span className="tp-anchor">
            <DesktopTimerPill
              primary={primary}
              extraCount={Math.max(0, timers.length - 1)}
              elapsed={primary ? elapsedOf(primary, now) : 0}
              onClick={() => {
                if (timers.length > 0) setTimersOpen((v) => !v);
                else setTimerPanelOpen((v) => !v);
              }}
              onStop={async () => {
                if (!primary) return;
                removeTimer(primary.entryId);
                await entriesApi.stopTimer(primary.entryId);
              }}
              ariaExpanded={timersOpen || timerPanelOpen}
            />
            {timersOpen && (
              <RunningTimersDropdown
                timers={timers}
                now={now}
                onStop={async (entryId) => { removeTimer(entryId); await entriesApi.stopTimer(entryId); }}
                onSelectTask={(id) => { setSelectedTaskId(id); setTimersOpen(false); }}
                onTrackNew={() => { setTimersOpen(false); setTimerPanelOpen(true); }}
                onClose={() => setTimersOpen(false)}
              />
            )}
            {timerPanelOpen && (
              <TimerPanel
                onClose={() => setTimerPanelOpen(false)}
                onSelectTask={(id) => { setSelectedTaskId(id); setTimerPanelOpen(false); }}
              />
            )}
          </span>
          <button
            className="dt-avatar"
            onClick={() => setView({ kind: 'settings' })}
            title="Settings"
            aria-label="Settings"
          >{initials}</button>
        </div>
      </div>

      <div className="dt-body">
        {/* LEFT RAIL */}
        <aside className="dt-rail">
          <div className="dt-rail-section">
            {NAV.map((n) => (
              <button
                key={n.id}
                className={`dt-rail-item ${view.kind === n.id ? 'active' : ''}`}
                onClick={() => setView({ kind: n.id })}
              >
                {n.icon}
                <span className="dt-truncate">{n.label}</span>
              </button>
            ))}
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
            ><Icon.Plus size={11} /></button>
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
              <button
                className="dt-rail-head"
                style={{ width: '100%', cursor: 'pointer', background: 'none', border: 0 }}
                onClick={() => setArchiveOpen((o) => !o)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon.ChevronRight size={9} style={{ transform: archiveOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                  Archived <span style={{ color: 'var(--text-4)', fontWeight: 500 }}>· {archived.length}</span>
                </span>
              </button>
              {archiveOpen && (
                <div className="dt-rail-section">
                  {archived.map((p) => (
                    <button
                      key={p.id}
                      className="dt-rail-item archived"
                      onClick={() => setView({ kind: 'project', id: p.id })}
                    >
                      <span className="dt-swatch" style={{ background: p.colorHex, opacity: 0.5 }} />
                      <span className="dt-truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ flex: 1 }} />
        </aside>

        {/* CENTER */}
        <main className="dt-center">
          {renderCenter()}
        </main>

        {/* INSPECTOR */}
        <Inspector
          taskId={selectedTaskId}
          onClear={() => setSelectedTaskId(null)}
          onSelectTask={(id) => setSelectedTaskId(id)}
          onSelectProject={(id) => setView({ kind: 'project', id })}
        />
      </div>

      {/* STATUS BAR */}
      <div className="dt-statusbar">
        <OnlineIndicator />
        <span className="dt-sep" />
        <span style={{ flex: 1 }} />
        <span className="mono">{fmtHM(totalTracked)} tracked</span>
        <span className="dt-sep" />
        <span style={{ color: 'var(--text-4)' }}>{__APP_VERSION__} · {user?.email}</span>
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

interface PillProps {
  primary: import('@/state/running').RunningTimer | null;
  extraCount: number;
  elapsed: number;
  onClick: () => void;
  onStop: () => void | Promise<void>;
  ariaExpanded: boolean;
}
function DesktopTimerPill({ primary, extraCount, elapsed, onClick, onStop, ariaExpanded }: PillProps) {
  return (
    <button
      className={`dt-timer-pill ${primary ? 'running' : 'idle'}`}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={ariaExpanded}
    >
      {primary ? (
        <>
          <span className="dt-tp-live" />
          <span className="dt-truncate" style={{ maxWidth: 180 }}>
            {primary.taskTitle ?? 'Tracking'}
          </span>
          <span className="mono dt-tp-time">{fmtHMS(elapsed)}</span>
          <span
            className="dt-tp-stop"
            onClick={(e) => { e.stopPropagation(); void onStop(); }}
            role="button"
            aria-label="Pause timer"
          >
            <Icon.Pause size={11} />
          </span>
          {extraCount > 0 && <span className="dt-tp-more">+{extraCount}</span>}
        </>
      ) : (
        <>
          <Icon.Play size={12} />
          <span>No timer running</span>
        </>
      )}
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
    <button className={`dt-conn ${online ? '' : 'offline'}`}>
      {online ? <Icon.Cloud size={11} /> : <Icon.CloudOff size={11} />}
      <span>{online ? 'All changes synced' : 'Offline'}</span>
    </button>
  );
}
