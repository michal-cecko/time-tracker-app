import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import { entries as entriesApi } from '@/api/mutations';
import { useRunning } from '@/state/running';
import { fmtHM } from '@/utils/format';
import type { Project, Task, TimeEntry } from '@/api/types';

interface TimerPanelProps {
  onClose: () => void;
  onSelectTask?: (id: string) => void;
}

interface TaskLite { id: string; title: string; projectId: string; }

/**
 * ClickUp-style timer popover anchored below the title-bar pill.
 *
 * Top half: composer — time input ("3h 20m"), task picker, time range,
 *   notes, save/play button. An empty time input starts an open-ended
 *   timer; a parsed duration creates a finished manual entry.
 * Bottom half: last 7 days of entries grouped by day with day totals.
 *   Each row offers replay (start a new timer for that task) and delete.
 */
export function TimerPanel({ onClose, onSelectTask }: TimerPanelProps) {
  const upsertTimer = useRunning((s) => s.upsertTimer);

  const [timeInput, setTimeInput] = useState('');
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [startedAt, setStartedAt] = useState(fmtTimeHM(new Date()));
  const [endedAt, setEndedAt] = useState(fmtTimeHM(new Date()));
  const [date] = useState(new Date());

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [history, setHistory] = useState<TimeEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Bootstrap: fetch projects, recent entries, and flatten task list for the
  // picker. Single round-trip per project for the tree.
  useEffect(() => {
    (async () => {
      const [ps, hist] = await Promise.all([
        api<Project[]>('/projects?archived=false').catch(() => []),
        api<TimeEntry[]>('/time-entries').catch(() => []),
      ]);
      setProjects(ps);
      setHistory(hist);
      const flat: TaskLite[] = [];
      await Promise.all(ps.map(async (p) => {
        try {
          const tree = await api<Task[]>(`/projects/${p.id}/tasks`);
          const walk = (t: Task) => { flat.push({ id: t.id, title: t.title, projectId: p.id }); t.children?.forEach(walk); };
          tree.forEach(walk);
        } catch { /* offline / project deleted */ }
      }));
      setTasks(flat);
    })();
  }, []);

  // Click-outside to close. We attach to mousedown so React's click handlers
  // inside the panel still fire before we tear down.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const selectedTask = pickedTaskId ? tasks.find((t) => t.id === pickedTaskId) ?? null : null;
  const selectedProject = selectedTask ? projects.find((p) => p.id === selectedTask.projectId) ?? null : null;

  const parsedDuration = useMemo(() => parseDuration(timeInput), [timeInput]);

  // Always starts a *new* concurrent timer for the picked task. The backend is
  // idempotent per task, so re-starting a task that's already running is a
  // no-op rather than a duplicate.
  const startTimer = async () => {
    setSaving(true);
    try {
      const startedAtIso = new Date().toISOString();
      const taskId = pickedTaskId ?? null;
      upsertTimer({
        entryId: 'pending',
        taskId,
        taskTitle: selectedTask?.title ?? null,
        projectId: selectedProject?.id,
        projectColor: selectedProject?.colorHex,
        projectName: selectedProject?.name ?? null,
        startedAt: startedAtIso,
      });
      const entry = await entriesApi.startTimer(taskId);
      if (entry) {
        upsertTimer({
          entryId: entry.id,
          taskId: entry.taskId ?? null,
          taskTitle: selectedTask?.title ?? null,
          projectId: selectedProject?.id,
          projectColor: selectedProject?.colorHex,
          projectName: selectedProject?.name ?? null,
          startedAt: entry.startedAt,
        });
      }
      // Reset composer fields after starting and close the panel.
      setTimeInput(''); setNote(''); setPickedTaskId(null);
      onClose();
    } finally { setSaving(false); }
  };

  const saveManual = async () => {
    if (!parsedDuration) return;
    setSaving(true);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - parsedDuration * 1000);
      await entriesApi.createManual(
        pickedTaskId ?? '',
        start.toISOString(),
        end.toISOString(),
        note || undefined,
        parsedDuration,
      );
      setTimeInput(''); setNote('');
      await reloadHistory();
    } finally { setSaving(false); }
  };

  const reloadHistory = async () => {
    try { setHistory(await api<TimeEntry[]>('/time-entries')); } catch { /* offline */ }
  };

  const replay = async (e: TimeEntry) => {
    if (!e.taskId) return;
    upsertTimer({
      entryId: 'pending',
      taskId: e.taskId,
      taskTitle: e.task?.title ?? null,
      projectId: e.task?.project?.id,
      projectColor: e.task?.project?.colorHex,
      projectName: e.task?.project?.name ?? null,
      startedAt: new Date().toISOString(),
    });
    const entry = await entriesApi.startTimer(e.taskId);
    if (entry) {
      upsertTimer({
        entryId: entry.id,
        taskId: entry.taskId ?? null,
        taskTitle: e.task?.title ?? null,
        projectId: e.task?.project?.id,
        projectColor: e.task?.project?.colorHex,
        projectName: e.task?.project?.name ?? null,
        startedAt: entry.startedAt,
      });
    }
    await reloadHistory();
  };

  const removeEntry = async (id: string) => {
    await entriesApi.remove(id);
    setHistory((h) => h.filter((e) => e.id !== id));
  };

  const groups = useMemo(() => groupByDay(history.slice(0, 80)), [history]);
  const todayTotal = useMemo(() => totalForDate(history, new Date()), [history]);
  // 6h is a placeholder daily goal — matches the ClickUp screenshot. Hook
  // up to Settings.dailyGoalSeconds when that ships.
  const goalSeconds = 6 * 3600;

  return (
    <div className="tp-panel" ref={rootRef} role="dialog" aria-label="Track time">
      <header className="tp-head">
        <span style={{ fontWeight: 600 }}>Track Time</span>
        <span className="mono tp-head-total">
          {fmtHM(todayTotal)} <span style={{ color: 'var(--text-3)' }}>/ {fmtHM(goalSeconds)}</span>
        </span>
      </header>

      <div className="tp-composer">
        <div className="tp-time-row">
          <input
            type="text"
            className="tp-time-input"
            placeholder="Enter time (ex: 3h 20m) or start timer"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
          {parsedDuration ? null : (
            <button
              className="tp-play"
              onClick={startTimer}
              disabled={saving}
              aria-label="Start timer"
            >
              <Icon.Play size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="tp-field-row"
          onClick={() => setTaskPickerOpen((v) => !v)}
        >
          <Icon.Target size={14} />
          {selectedTask ? (
            <span className="tp-field-val">
              <span className="dot" style={{ background: selectedProject?.colorHex }} />
              {selectedTask.title}
            </span>
          ) : (
            <span className="tp-field-placeholder">Select task</span>
          )}
          <Icon.ChevronDown size={12} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
        </button>
        {taskPickerOpen && (
          <TaskPicker
            tasks={tasks}
            projects={projects}
            onPick={(id) => { setPickedTaskId(id); setTaskPickerOpen(false); }}
            onClear={() => { setPickedTaskId(null); setTaskPickerOpen(false); }}
          />
        )}

        <div className="tp-field-row tp-static">
          <Icon.Calendar size={13} />
          <span className="tp-field-val">{date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <input
            className="tp-mini-time mono"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
          <span style={{ color: 'var(--text-3)' }}>–</span>
          <input
            className="tp-mini-time mono"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
          />
        </div>

        <div className="tp-field-row tp-static">
          <Icon.Edit size={13} />
          <input
            type="text"
            className="tp-note-input"
            placeholder="Notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="tp-footer">
          <span /> {/* placeholder where the billable toggle would go */}
          <button
            className="btn primary"
            disabled={!parsedDuration || saving}
            onClick={saveManual}
          >Save</button>
        </div>
      </div>

      <div className="tp-history">
        {groups.length === 0 && (
          <div className="tp-empty">No recent entries.</div>
        )}
        {groups.map((g) => (
          <div key={g.dateKey} className="tp-day">
            <div className="tp-day-head">
              <span>{g.label}</span>
              <span className="mono tp-day-total">{fmtHM(g.total)}</span>
            </div>
            {g.entries.map((e) => {
              const proj = e.task?.project;
              const ancestors = e.task?.ancestors ?? [];
              const ancestorTitles = ancestors.map((a) => a.title);
              return (
                <div key={e.id} className="tp-entry">
                  <div className="tp-entry-main" onClick={() => e.task && onSelectTask?.(e.task.id)}>
                    {proj && (
                      <div className="tp-entry-meta">
                        <span className="dot" style={{ background: proj.colorHex }} />
                        {[proj.name, ...ancestorTitles].join(' › ')}
                      </div>
                    )}
                    <div className="tp-entry-title">
                      {e.task?.title ?? 'Unassigned entry'}
                    </div>
                    <div className="tp-entry-sub">
                      {fmtRangeLabel(e.startedAt, e.endedAt)}
                    </div>
                  </div>
                  <span className="mono tp-entry-dur">{fmtHM(e.endedAt ? e.durationSeconds : 0)}</span>
                  <button
                    className="tp-entry-btn"
                    onClick={(ev) => { ev.stopPropagation(); replay(e); }}
                    disabled={!e.taskId}
                    aria-label="Resume timer for this task"
                    title={e.taskId ? 'Resume timer' : 'Unassigned entry — no task to resume'}
                  >
                    <Icon.Play size={12} />
                  </button>
                  <button
                    className="tp-entry-btn tp-entry-del"
                    onClick={(ev) => { ev.stopPropagation(); removeEntry(e.id); }}
                    aria-label="Delete entry"
                  >
                    <Icon.Trash size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskPicker({
  tasks, projects, onPick, onClear,
}: {
  tasks: TaskLite[];
  projects: Project[];
  onPick: (id: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState('');
  const projById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const hits = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tasks.slice(0, 30);
    return tasks.filter((t) => t.title.toLowerCase().includes(term)).slice(0, 30);
  }, [q, tasks]);

  return (
    <div className="tp-picker">
      <input
        type="text"
        autoFocus
        placeholder="Search tasks…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="tp-picker-input"
      />
      <div className="tp-picker-list">
        <button className="tp-picker-row tp-picker-clear" onClick={onClear}>
          <Icon.X size={12} /> Unassigned
        </button>
        {hits.map((t) => {
          const proj = projById.get(t.projectId);
          return (
            <button key={t.id} className="tp-picker-row" onClick={() => onPick(t.id)}>
              {proj && <span className="dot" style={{ background: proj.colorHex }} />}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{proj?.name}</span>
            </button>
          );
        })}
        {hits.length === 0 && <div className="tp-picker-empty">No matches.</div>}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

// "3h 20m" / "3h" / "20m" / "1:30" / "90" → seconds, or null if not parseable.
function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  // Colon form 1:30 or 1:30:00
  const colon = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const h = Number(colon[1]); const m = Number(colon[2]); const sec = colon[3] ? Number(colon[3]) : 0;
    return h * 3600 + m * 60 + sec;
  }
  // h/m/s tokens
  const m = s.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/);
  if (m && (m[1] || m[2] || m[3])) {
    return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
  }
  // Bare integer = minutes (ClickUp convention).
  if (/^\d+$/.test(s)) return Number(s) * 60;
  return null;
}

function fmtTimeHM(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtRangeLabel(startedAt: string, endedAt: string | null): string {
  const s = new Date(startedAt);
  const e = endedAt ? new Date(endedAt) : null;
  const date = s.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const range = `${fmtTimeHM(s)} – ${e ? fmtTimeHM(e) : 'now'}`;
  const tz = s.toLocaleTimeString([], { timeZoneName: 'short' }).split(' ').pop();
  return `${date}, ${range} ${tz ?? ''}`.trim();
}

interface DayGroup { dateKey: string; label: string; total: number; entries: TimeEntry[]; }

function groupByDay(entries: TimeEntry[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const e of entries) {
    const d = new Date(e.startedAt);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    let g = map.get(key);
    if (!g) { g = { dateKey: key, label, total: 0, entries: [] }; map.set(key, g); }
    g.entries.push(e);
    g.total += e.endedAt ? e.durationSeconds : 0;
  }
  // Keep newest day first; entries within a day are already newest-first from the API.
  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 7);
}

function totalForDate(entries: TimeEntry[], when: Date): number {
  const key = when.toISOString().slice(0, 10);
  let total = 0;
  for (const e of entries) {
    if (e.startedAt.slice(0, 10) !== key) continue;
    total += e.endedAt ? e.durationSeconds : Math.max(0, Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000));
  }
  return total;
}
