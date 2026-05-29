import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusDot, StatusPill, StatusPicker } from '@/components/ui/Status';
import { ActionSheet } from '@/components/ui/sheets/ActionSheet';
import { ConfirmSheet } from '@/components/ui/sheets/ConfirmSheet';
import { EditTaskSheet } from '@/components/ui/sheets/EditTaskSheet';
import { MoveTaskSheet } from '@/components/ui/sheets/MoveTaskSheet';
import { EditEntrySheet } from '@/components/ui/sheets/EditEntrySheet';
import { LogEntrySheet } from '@/components/ui/sheets/LogEntrySheet';
import { QuickAddSheet } from '@/screens/mobile/QuickAdd';
import { RichEditor, type RichDoc } from '@/components/ui/RichEditor';
import { useDebouncedCallback } from '@/utils/debounce';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import { tasks as tasksApi, entries as entriesApi } from '@/api/mutations';
import type { ActivityLog, BillingMode, Project, Task, TimeEntry } from '@/api/types';
import { STATUS_META } from '@/api/types';
import { fmtClock, fmtHM, fmtHMS, fmtMoneyCents } from '@/utils/format';
import { useRunning } from '@/state/running';

export function Inspector({
  taskId,
  onClear,
  onSelectTask,
  onSelectProject,
}: {
  taskId: string | null;
  onClear: () => void;
  onSelectTask?: (id: string) => void;
  onSelectProject?: (id: string) => void;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [picker, setPicker] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [entryEdit, setEntryEdit] = useState<TimeEntry | null>(null);
  const [entryDelete, setEntryDelete] = useState<TimeEntry | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [quickAddSubtask, setQuickAddSubtask] = useState(false);
  const [billingDraft, setBillingDraft] = useState<{ mode: BillingMode; rate: string; price: string } | null>(null);
  const { running, elapsed, tick } = useRunning();

  const load = async (id: string) => {
    const t = await api<Task>(`/tasks/${id}`);
    setTask(t);
    setBillingDraft({
      mode: t.billingMode,
      rate: t.hourlyRateCents != null ? (t.hourlyRateCents / 100).toString() : '',
      price: t.taskPriceCents != null ? (t.taskPriceCents / 100).toString() : '',
    });
    const [es, p, a] = await Promise.all([
      api<TimeEntry[]>(`/tasks/${id}/time-entries?descendants=true`),
      api<Project>(`/projects/${t.projectId}`).catch(() => null),
      api<ActivityLog[]>(`/activity?taskId=${id}&limit=30`).catch(() => [] as ActivityLog[]),
    ]);
    setEntries(es);
    setProject(p);
    setActivity(a);
  };

  useEffect(() => {
    if (!taskId) { setTask(null); setProject(null); setEntries([]); setActivity([]); setBillingDraft(null); return; }
    load(taskId);
    const offs = [
      onRealtime('task.upserted', (t: Task) => { if (t.id === taskId) load(taskId); }),
      onRealtime('entry.upserted', () => load(taskId)),
      onRealtime('entry.deleted', () => load(taskId)),
      onRealtime('timer.started', () => load(taskId)),
      onRealtime('timer.stopped', () => load(taskId)),
    ];
    const tickId = setInterval(tick, 1000);
    return () => { offs.forEach((o) => o()); clearInterval(tickId); };
  }, [taskId]);

  if (!task) {
    return (
      <aside className="dt-inspector empty">
        <div className="dt-empty">
          <Icon.Folder size={28} />
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-3)' }}>Select a task</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>Open its detail in the inspector</div>
        </div>
      </aside>
    );
  }

  const isRunning = !!running && running.taskId === task.id;
  const tracked = isRunning ? elapsed : task.totalTime;
  const est = task.estimateSeconds;
  const pct = est ? (tracked / est) * 100 : 0;
  const over = est ? tracked > est : false;

  const saveBilling = async (draft: { mode: BillingMode; rate: string; price: string }) => {
    const patch: Record<string, unknown> = { billingMode: draft.mode };
    if (draft.mode === 'HOURLY_RATE') {
      patch.hourlyRateCents = Math.round(Number(draft.rate || 0) * 100);
      patch.taskPriceCents = null;
    } else if (draft.mode === 'TASK_PRICE') {
      patch.taskPriceCents = Math.round(Number(draft.price || 0) * 100);
      patch.hourlyRateCents = null;
    } else {
      patch.hourlyRateCents = null;
      patch.taskPriceCents = null;
    }
    await api(`/tasks/${task.id}`, { method: 'PATCH', body: patch });
    if (taskId) load(taskId);
  };

  return (
    <aside className="dt-inspector">
      <div className="dt-insp-head">
        <span className="dt-muted" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {project && (
            <button
              className="dt-ghost"
              onClick={() => onSelectProject?.(project.id)}
              style={{ padding: 0, gap: 6, display: 'inline-flex', alignItems: 'center', color: 'var(--text-3)' }}
            >
              <span className="dt-swatch" style={{ background: project.colorHex }} />
              {project.name}
            </button>
          )}
        </span>
        <div style={{ display: 'inline-flex', gap: 4 }}>
          <button className="dt-ghost" onClick={() => setActionsOpen(true)} aria-label="Task actions"><Icon.More size={12} /></button>
          <button className="dt-ghost" onClick={onClear} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6l-6.5 6.5L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="dt-insp-body">
        <div className="dt-insp-title">{task.title}</div>

        <div className="dt-insp-chips">
          <StatusPill status={task.status} onClick={() => setPicker(true)} />
          {task.urgent && (
            <span className="dt-chip urgent">
              <Icon.Flag size={10} /> Urgent
            </span>
          )}
          {task.dueDate && (
            <span className="dt-chip">
              <Icon.Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.ancestors && task.ancestors.length > 0 && (
            <span className="dt-chip" title="Parent">
              {task.ancestors[task.ancestors.length - 1].title}
            </span>
          )}
        </div>

        <div className="dt-insp-timer">
          <div className="dt-insp-timer-head">
            <span className="dt-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              {isRunning ? 'Tracking now' : 'Time'}
            </span>
            <span className="mono dt-muted" style={{ fontSize: 11 }}>
              {est ? `${Math.round(pct)}% of estimate` : 'no estimate'}
            </span>
          </div>
          <div
            className="dt-insp-timer-big mono"
            style={{ color: isRunning ? 'var(--accent)' : 'var(--text)' }}
          >
            {isRunning ? fmtHMS(tracked) : fmtHM(tracked)}
            {est ? <span className="dt-muted" style={{ fontSize: 14 }}> / {fmtHM(est)}</span> : null}
          </div>
          {est ? (
            <div className="dt-progress">
              <div style={{ width: `${Math.min(100, pct)}%`, background: over ? 'var(--st-return)' : 'var(--accent)' }} />
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button
              className="dt-btn primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={async () => {
                if (isRunning) await entriesApi.stopTimer();
                else await entriesApi.startTimer(task.id);
              }}
            >
              {isRunning ? <><Icon.Pause size={12} /> Pause</> : <><Icon.Play size={11} /> Start timer</>}
            </button>
            <button className="dt-btn" onClick={() => setLogOpen(true)}><Icon.Plus size={11} /> Log</button>
          </div>
        </div>

        {billingDraft && (
          <div className="dt-insp-section">
            <div className="dt-insp-sec-head">Billing</div>
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {(['NONE', 'HOURLY_RATE', 'TASK_PRICE'] as BillingMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      const next = { ...billingDraft, mode: m };
                      setBillingDraft(next);
                      saveBilling(next);
                    }}
                    style={{
                      flex: 1, height: 28,
                      background: billingDraft.mode === m ? 'var(--accent-tint)' : 'var(--bg-elev-2)',
                      color: billingDraft.mode === m ? 'var(--accent)' : 'var(--text-2)',
                      borderRadius: 6, fontSize: 11, fontWeight: 500,
                    }}
                  >
                    {m === 'NONE' ? 'None' : m === 'HOURLY_RATE' ? 'Hourly' : 'Fixed'}
                  </button>
                ))}
              </div>

              {billingDraft.mode === 'HOURLY_RATE' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>Rate (€/hour)</div>
                  <input
                    type="number" min={0} step={1}
                    value={billingDraft.rate}
                    onChange={(e) => setBillingDraft({ ...billingDraft, rate: e.target.value })}
                    onBlur={() => saveBilling(billingDraft)}
                    className="mono"
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-elev-2)', color: 'var(--text)', borderRadius: 6, fontSize: 14, fontWeight: 600, border: 'none', outline: 'none' }}
                  />
                </div>
              )}
              {billingDraft.mode === 'TASK_PRICE' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>Fixed price (€)</div>
                  <input
                    type="number" min={0} step={1}
                    value={billingDraft.price}
                    onChange={(e) => setBillingDraft({ ...billingDraft, price: e.target.value })}
                    onBlur={() => saveBilling(billingDraft)}
                    className="mono"
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-elev-2)', color: 'var(--text)', borderRadius: 6, fontSize: 14, fontWeight: 600, border: 'none', outline: 'none' }}
                  />
                </div>
              )}

              {(billingDraft.mode !== 'NONE' || task.earnedSoFarCents != null) && (
                <div className="dt-bill">
                  {billingDraft.mode !== 'NONE' && (
                    <div>
                      <div className="dt-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                        {billingDraft.mode === 'TASK_PRICE' ? 'Task price' : 'Hourly rate'}
                      </div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
                        {fmtMoneyCents(billingDraft.mode === 'TASK_PRICE' ? task.taskPriceCents : task.hourlyRateCents)}
                        {billingDraft.mode === 'HOURLY_RATE' ? '/h' : ''}
                      </div>
                    </div>
                  )}
                  <div style={{ textAlign: billingDraft.mode === 'NONE' ? 'left' : 'right' }}>
                    <div className="dt-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Earned</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--st-done)' }}>{fmtMoneyCents(task.earnedSoFarCents)}</div>
                  </div>
                  {billingDraft.mode === 'TASK_PRICE' && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="dt-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Projected</div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{fmtMoneyCents(task.projectedTotalCents)}</div>
                    </div>
                  )}
                  {billingDraft.mode === 'NONE' && task.earnedSoFarCents != null && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Rolled up from subtasks</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="dt-insp-section">
          <div className="dt-insp-sec-head">
            Subtasks {task.children && task.children.length > 0 && <span className="dt-muted">· {task.children.length}</span>}
            <button className="dt-ghost" style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: 11 }} onClick={() => setQuickAddSubtask(true)}><Icon.Plus size={10} /> Add</button>
          </div>
          {task.children && task.children.length > 0 && (
            <div className="dt-sub-list">
              {task.children.map((c) => (
                <div
                  key={c.id}
                  className="dt-sub-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectTask?.(c.id)}
                >
                  <StatusDot status={c.status} />
                  <span className="dt-truncate" style={{ flex: 1 }}>{c.title}</span>
                  <span className="mono dt-muted" style={{ fontSize: 11 }}>{fmtHM(c.totalTime)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dt-insp-section">
          <div className="dt-insp-sec-head">
            Time entries <span className="dt-muted">· {entries.length}</span>
          </div>
          <div className="dt-entries">
            {entries.length === 0 && (
              <div className="dt-muted" style={{ padding: 12, textAlign: 'center', fontSize: 11 }}>No entries yet</div>
            )}
            {entries.slice(0, 8).map((e) => {
              const live = !e.endedAt;
              const dur = e.endedAt ? e.durationSeconds : Math.max(0, Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000));
              return (
                <div key={e.id} className="dt-entry">
                  {live && <span className="dt-live-dot" />}
                  <span
                    className="mono"
                    style={{ fontSize: 13, fontWeight: 500, color: live ? 'var(--accent)' : 'var(--text)', width: 56 }}
                  >{fmtHM(dur)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dt-muted" style={{ fontSize: 11 }}>
                      {fmtClock(new Date(e.startedAt))}{e.endedAt ? ` – ${fmtClock(new Date(e.endedAt))}` : live ? ' · running' : ''}
                    </div>
                    {e.note && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.note}</div>}
                  </div>
                  {e.manual && <span className="dt-tag">manual</span>}
                  <button className="dt-ghost" onClick={() => setEntryEdit(e)} aria-label="Edit"><Icon.Edit size={11} /></button>
                  <button className="dt-ghost" onClick={() => setEntryDelete(e)} aria-label="Delete"><Icon.Trash size={11} /></button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dt-insp-section">
          <div className="dt-insp-sec-head">Description</div>
          <div style={{ padding: '0 14px 14px' }}>
            <DescriptionEditor task={task} />
          </div>
        </div>

        {activity.length > 0 && (
          <div className="dt-insp-section">
            <div className="dt-insp-sec-head">
              Activity <span className="dt-muted">· {activity.length}</span>
            </div>
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activity.slice(0, 20).map((a) => (
                <ActivityItem key={a.id} a={a} />
              ))}
            </div>
          </div>
        )}
      </div>

      {picker && (
        <StatusPicker
          current={task.status}
          onPick={async (s) => { await tasksApi.setStatus(task.id, s); }}
          onClose={() => setPicker(false)}
        />
      )}
      {actionsOpen && (
        <ActionSheet
          title={task.title}
          subtitle="Task actions"
          actions={[
            { label: 'Edit', icon: <Icon.Edit size={14} />, onClick: () => setEditOpen(true) },
            { label: 'Move to…', icon: <Icon.ChevronRight size={14} />, onClick: () => setMoveOpen(true) },
            { label: 'Duplicate', icon: <Icon.Plus size={14} />, onClick: async () => { try { await tasksApi.duplicate(task.id); } catch {} } },
            { label: 'Delete', danger: true, icon: <Icon.Trash size={14} />, onClick: () => setConfirmDelete(true) },
          ]}
          onClose={() => setActionsOpen(false)}
        />
      )}
      {editOpen && (
        <EditTaskSheet
          task={task}
          onClose={() => setEditOpen(false)}
          onMove={() => setMoveOpen(true)}
          onDelete={() => setConfirmDelete(true)}
          onSaved={() => taskId && load(taskId)}
        />
      )}
      {moveOpen && (
        <MoveTaskSheet task={task} onClose={() => setMoveOpen(false)} onMoved={() => taskId && load(taskId)} />
      )}
      {confirmDelete && (
        <ConfirmSheet
          title="Delete task?"
          message={`"${task.title}" and any subtasks + time entries will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={async () => { try { await tasksApi.remove(task.id); onClear(); } catch {} }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      {entryEdit && (
        <EditEntrySheet
          entry={entryEdit}
          onClose={() => setEntryEdit(null)}
          onDeleteRequest={() => setEntryDelete(entryEdit)}
        />
      )}
      {entryDelete && (
        <ConfirmSheet
          title="Delete entry?"
          message="This time entry will be permanently removed."
          confirmLabel="Delete"
          onConfirm={async () => { try { await entriesApi.remove(entryDelete.id); if (taskId) load(taskId); } catch {} }}
          onClose={() => setEntryDelete(null)}
        />
      )}
      {logOpen && (
        <LogEntrySheet
          taskId={task.id}
          onClose={() => { setLogOpen(false); if (taskId) load(taskId); }}
        />
      )}
      {quickAddSubtask && (
        <QuickAddSheet
          parentTaskId={task.id}
          parentTaskTitle={task.title}
          defaultProjectId={task.projectId}
          onClose={() => { setQuickAddSubtask(false); if (taskId) load(taskId); }}
        />
      )}
    </aside>
  );
}

function ActivityItem({ a }: { a: ActivityLog }) {
  const when = new Date(a.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
      <span className="mono dt-muted" style={{ fontSize: 11, minWidth: 88 }}>{when}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>{renderActivity(a)}</span>
    </div>
  );
}

function renderActivity(a: ActivityLog): React.ReactNode {
  switch (a.kind) {
    case 'STATUS_CHANGED': {
      const from = a.meta?.from as keyof typeof STATUS_META | undefined;
      const to = a.meta?.to as keyof typeof STATUS_META | undefined;
      return (
        <>
          Status:{' '}
          {from && <StatusChip name={from} />}
          <span style={{ margin: '0 6px', color: 'var(--text-3)' }}>→</span>
          {to && <StatusChip name={to} />}
        </>
      );
    }
    case 'TASK_CREATED': return 'Task created';
    case 'TASK_UPDATED': return 'Task updated';
    case 'MANUAL_ENTRY_ADDED': return 'Manual entry added';
    case 'TIME_TRACKED': return 'Time tracked';
    case 'COMMENT': return 'Comment';
    case 'OVER_ESTIMATE': return 'Over estimate';
    default: return a.kind;
  }
}

function StatusChip({ name }: { name: keyof typeof STATUS_META }) {
  const meta = STATUS_META[name];
  return (
    <span
      className="dt-chip"
      style={{ background: `${meta.hex}1f`, color: meta.hex, padding: '1px 7px', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', borderRadius: 4 }}
    >
      {meta.label}
    </span>
  );
}

function DescriptionEditor({ task }: { task: Task }) {
  const [local, setLocal] = useState<RichDoc | null>((task.description as RichDoc | null) ?? null);
  useEffect(() => { setLocal((task.description as RichDoc | null) ?? null); }, [task.id]);
  const save = useDebouncedCallback((doc: RichDoc) => {
    void tasksApi.update(task.id, { description: doc as Record<string, unknown> });
  }, 600);
  return (
    <RichEditor
      value={local}
      placeholder="Add a description…"
      onChange={(doc) => { setLocal(doc); save(doc); }}
      compact
    />
  );
}
