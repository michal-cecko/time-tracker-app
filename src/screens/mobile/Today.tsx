import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/ui/AppHeader';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/Status';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { api } from '@/api/client';
import { entries as entriesApi } from '@/api/mutations';
import { onRealtime } from '@/api/websocket';
import type { Project, Task, TimeEntry, WeeklyReport } from '@/api/types';
import { fmtHM, fmtHMS, fmtRelative } from '@/utils/format';
import { useNav } from '@/state/stack';
import { useRunning, elapsedOf, combinedElapsed, type RunningTimer } from '@/state/running';

interface TaskWithCtx { task: Task; project: Project }

interface TodayData {
  projects: Project[];
  weekly: WeeklyReport | null;
  urgent: TaskWithCtx[];
  alsoToday: TaskWithCtx[];
  // task id → its task + project, for cross-referencing running timers.
  taskById: Map<string, TaskWithCtx>;
  lastTrackedTask: Task | null;
}

const LAST_TRACKED_KEY = 'time-tracker:last-tracked-task-id';

function isToday(d: string | null | undefined): boolean {
  if (!d) return false;
  const x = new Date(d);
  const t = new Date();
  return x.toDateString() === t.toDateString();
}

export function TodayScreen() {
  const [data, setData] = useState<TodayData | null>(null);
  const [heroExpanded, setHeroExpanded] = useState(true);
  const { push } = useNav();
  const { timers, now, tick, setTimers, upsertTimer, removeTimer } = useRunning();

  // Keep elapsed live while any timer runs (MiniTimerBar also ticks, but Today
  // can be visible without it).
  useEffect(() => {
    if (timers.length === 0) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timers.length, tick]);

  const load = async () => {
    const [projects, runningRaw, weekly] = await Promise.all([
      api<Project[]>('/projects?archived=false'),
      api<TimeEntry[]>('/time-entries/running').catch(() => [] as TimeEntry[]),
      api<WeeklyReport>('/reports/weekly'),
    ]);
    const runningEntries = Array.isArray(runningRaw) ? runningRaw : runningRaw ? [runningRaw] : [];

    // For each active project, fetch its tasks tree → flatten leaves → pick urgent + today.
    const treeByProject = await Promise.all(projects.map((p) => api<Task[]>(`/projects/${p.id}/tasks`)));
    const allTasks: Array<{ task: Task; project: Project }> = [];
    const walk = (t: Task, project: Project) => {
      allTasks.push({ task: t, project });
      for (const c of t.children) walk(c, project);
    };
    treeByProject.forEach((tree, i) => tree.forEach((t) => walk(t, projects[i])));

    const open = allTasks.filter(({ task }) => !['DONE', 'INVOICED'].includes(task.status));
    const urgent = open.filter(({ task }) => task.urgent);

    // "Also today" — strict: due today OR currently running. Fallback (when
    // the user hasn't set due dates yet) to in-progress / in-review work so
    // the section never collapses on a fresh install. Mirrors DesktopToday.
    const nonUrgent = open.filter(({ task }) => !task.urgent);
    const strict = nonUrgent.filter(({ task }) => isToday(task.dueDate) || task.running);
    const fallback = nonUrgent.filter(({ task }) => ['IN_PROGRESS', 'IN_REVIEW'].includes(task.status));
    const alsoToday = (strict.length ? strict : fallback).slice(0, 12);

    const taskById = new Map<string, TaskWithCtx>(allTasks.map((tc) => [tc.task.id, tc]));

    // Hydrate the running-timer set from the array of open entries.
    const runningTimers: RunningTimer[] = runningEntries.map((e) => {
      const ctx = e.taskId ? taskById.get(e.taskId) : null;
      return {
        entryId: e.id,
        taskId: e.taskId ?? null,
        taskTitle: ctx?.task.title ?? null,
        projectId: ctx?.project.id,
        projectColor: ctx?.project.colorHex,
        projectName: ctx?.project.name ?? null,
        startedAt: e.startedAt,
      };
    });
    setTimers(runningTimers);
    const primaryTaskId = runningTimers.find((t) => t.taskId)?.taskId;
    if (primaryTaskId) { try { localStorage.setItem(LAST_TRACKED_KEY, primaryTaskId); } catch { /* ignore quota */ } }

    // Pinned "last tracked" card — when nothing is running, fall back to the
    // most recently tracked task so the user can resume with one tap.
    let lastTrackedTask: Task | null = null;
    if (runningTimers.length === 0) {
      let lastId: string | null = null;
      try { lastId = localStorage.getItem(LAST_TRACKED_KEY); } catch { /* no storage */ }
      if (lastId) {
        const found = taskById.get(lastId);
        if (found) lastTrackedTask = found.task;
      }
    }

    setData({ projects, weekly, urgent, alsoToday, taskById, lastTrackedTask });
  };

  useEffect(() => {
    load();
    const offs = [
      onRealtime('timer.started', () => load()),
      onRealtime('timer.stopped', () => load()),
      onRealtime('task.upserted', () => load()),
      onRealtime('entry.upserted', () => load()),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  const today = new Date();
  const sub = `${today.toLocaleDateString([], { weekday: 'long' })} · ${today.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

  const stopTimer = async (entryId: string) => {
    removeTimer(entryId);
    try { await entriesApi.stopTimer(entryId); } catch { /* offline → optimistic stays */ }
  };
  const playTask = async (taskId: string) => {
    const ctx = data?.taskById.get(taskId) ?? null;
    upsertTimer({
      entryId: 'pending', taskId,
      taskTitle: ctx?.task.title ?? null,
      projectId: ctx?.project.id, projectColor: ctx?.project.colorHex, projectName: ctx?.project.name ?? null,
      startedAt: new Date().toISOString(),
    });
    const entry = await entriesApi.startTimer(taskId);
    if (entry) upsertTimer({
      entryId: entry.id, taskId: entry.taskId ?? taskId,
      taskTitle: ctx?.task.title ?? null,
      projectId: ctx?.project.id, projectColor: ctx?.project.colorHex, projectName: ctx?.project.name ?? null,
      startedAt: entry.startedAt,
    });
  };

  return (
    <>
      <AppHeader
        title="Today"
        sub={sub}
        right={
          <>
            <button className="icon-btn" onClick={() => push({ kind: 'search' })} aria-label="Search"><Icon.Search /></button>
            <button className="icon-btn" onClick={() => push({ kind: 'settings' })} aria-label="Settings"><Icon.Settings /></button>
          </>
        }
      />
      <div className="scroll">
        {timers.length > 0 ? (
          <div className="section">
            {timers.length > 1 && (
              <button
                className="tracking-accordion"
                onClick={() => setHeroExpanded((v) => !v)}
                aria-expanded={heroExpanded}
              >
                <span className="pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)' }}>
                  {timers.length} TIMERS RUNNING
                </span>
                <span className="right mono" style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  {fmtHMS(combinedElapsed(timers, now))} combined
                </span>
                <Icon.ChevronDown size={15} style={{ transform: heroExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--text-3)' }} />
              </button>
            )}
            {heroExpanded && timers.map((timer) => {
              const task = timer.taskId ? data?.taskById.get(timer.taskId)?.task ?? null : null;
              const shown = elapsedOf(timer, now);
              const est = task?.estimateSeconds ?? null;
              return (
                <div key={timer.entryId} className="card hi" style={{ padding: 16, marginBottom: 10 }}>
                  <div className="hstack" style={{ gap: 10, marginBottom: 10 }}>
                    <span className="pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)' }}>RUNNING</span>
                    {timer.projectName && (
                      <span className="right hstack" style={{ gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: timer.projectColor ?? 'var(--accent)' }} />
                        {timer.projectName}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{timer.taskTitle ?? 'Unassigned timer'}</div>
                  <div className="bigtimer" style={{ color: 'var(--accent)', fontSize: 56, marginBottom: 12 }}>{fmtHMS(shown)}</div>
                  {est && (
                    <>
                      <ProgressBar pct={(shown / est) * 100} over={shown > est} />
                      <div className="hstack" style={{ justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                        <span className="mono">{fmtHM(est)} est.</span>
                        <span className="mono">{fmtHM(task?.totalTime ?? shown)} total</span>
                      </div>
                    </>
                  )}
                  <div className="hstack" style={{ gap: 8, marginTop: 14 }}>
                    <button className="btn primary" onClick={() => stopTimer(timer.entryId)}><Icon.Pause size={14} />Pause</button>
                    {timer.taskId && <button className="btn" onClick={() => push({ kind: 'task', id: timer.taskId! })}>Open task</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : data?.lastTrackedTask ? (() => {
          const t = data.lastTrackedTask;
          const shown = t.totalTime;
          return (
            <div className="section">
              <div className="card hi" style={{ padding: 16 }}>
                <div className="hstack" style={{ gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-4)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-3)' }}>LAST TRACKED</span>
                  <span className="right muted mono" style={{ fontSize: 12 }}>{fmtRelative(new Date(t.updatedAt))}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t.title}</div>
                <div className="bigtimer" style={{ color: 'var(--text)', fontSize: 56, marginBottom: 12 }}>{fmtHM(shown)}</div>
                {t.estimateSeconds && (
                  <>
                    <ProgressBar pct={(shown / t.estimateSeconds) * 100} over={shown > t.estimateSeconds} />
                    <div className="hstack" style={{ justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                      <span className="mono">{fmtHM(shown)}</span>
                      <span className="mono">{fmtHM(t.estimateSeconds)}</span>
                    </div>
                  </>
                )}
                <div className="hstack" style={{ gap: 8, marginTop: 14 }}>
                  <button className="btn primary" onClick={() => playTask(t.id)}><Icon.Play size={14} />Resume</button>
                  <button className="btn" onClick={() => push({ kind: 'task', id: t.id })}>Open task</button>
                </div>
              </div>
            </div>
          );
        })() : null}

        {data && data.urgent.length > 0 && (
          <div className="section">
            <div className="section-head"><span>Up next · priority</span><span className="count">{data.urgent.length}</span></div>
            <div className="card">
              {data.urgent.map(({ task: t, project: p }) => (
                <TaskListRow key={t.id} task={t} project={p} onOpenTask={(id) => push({ kind: 'task', id })} onOpenProject={(id) => push({ kind: 'project', id })} onPlay={playTask} showFlag />
              ))}
            </div>
          </div>
        )}

        {data && data.alsoToday.length > 0 && (
          <div className="section">
            <div className="section-head">
              <span>{data.urgent.length > 0 ? 'Also today' : 'Tasks for today'}</span>
              <span className="count">{data.alsoToday.length}</span>
            </div>
            <div className="card">
              {data.alsoToday.map(({ task: t, project: p }) => (
                <TaskListRow key={t.id} task={t} project={p} onOpenTask={(id) => push({ kind: 'task', id })} onOpenProject={(id) => push({ kind: 'project', id })} onPlay={playTask} />
              ))}
            </div>
          </div>
        )}

        {data?.weekly && (
          <div className="section" style={{ marginTop: 28 }}>
            <div className="section-head"><span>Last 7 days</span><span className="count mono">{fmtHM(data.weekly.total)}</span></div>
            <div className="card" style={{ padding: '24px 12px 12px' }}>
              <div className="bars">
                {data.weekly.days.map((d) => {
                  const max = Math.max(...data.weekly!.days.map((x) => x.total), 1);
                  const h = Math.max(2, (d.total / max) * 100);
                  const today = d.date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={d.date} className={`bar ${today ? 'today' : ''}`}>
                      <div className="total mono">{d.total ? fmtHM(d.total) : ''}</div>
                      <div className="seg" style={{ height: `${h}%`, background: today ? 'var(--accent)' : 'var(--text-4)' }} />
                      <div className="day">{new Date(d.date + 'T00:00').toLocaleDateString([], { weekday: 'short' }).slice(0, 1)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </>
  );
}

function TaskListRow({
  task: t,
  project,
  onOpenTask,
  onOpenProject,
  onPlay,
  showFlag,
}: {
  task: Task;
  project: Project;
  onOpenTask: (id: string) => void;
  onOpenProject: (id: string) => void;
  onPlay: (id: string) => void;
  showFlag?: boolean;
}) {
  return (
    <div className="task" onClick={() => onOpenTask(t.id)} style={{ cursor: 'pointer' }}>
      <StatusDot status={t.status} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="meta" style={{ marginBottom: 2 }}>
          <Breadcrumbs
            project={{ id: project.id, name: project.name, colorHex: project.colorHex }}
            ancestors={t.ancestors}
            onProject={onOpenProject}
            onTask={onOpenTask}
          />
        </div>
        <div className="title-line">{t.title} {showFlag && <PriorityFlag urgent={t.urgent} />}</div>
        <div className="meta"><span className="mono">{fmtHM(t.totalTime)}{t.totalEstimate ? ` / ${fmtHM(t.totalEstimate)}` : ''}</span></div>
      </div>
      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onPlay(t.id); }} aria-label="Play">
        {t.running ? <Icon.Pause size={14} /> : <Icon.Play size={14} />}
      </button>
    </div>
  );
}
