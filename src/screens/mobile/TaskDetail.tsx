import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusPill, StatusPicker } from '@/components/ui/Status';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { NestedTaskRow } from '@/components/ui/TaskRow';
import { ActionSheet } from '@/components/ui/sheets/ActionSheet';
import { ConfirmSheet } from '@/components/ui/sheets/ConfirmSheet';
import { EditTaskSheet } from '@/components/ui/sheets/EditTaskSheet';
import { MoveTaskSheet } from '@/components/ui/sheets/MoveTaskSheet';
import { EditEntrySheet } from '@/components/ui/sheets/EditEntrySheet';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RichEditor, type RichDoc } from '@/components/ui/RichEditor';
import { useDebouncedCallback } from '@/utils/debounce';
import { QuickAddSheet } from './QuickAdd';
import { tasks as tasksApi, entries as entriesApi } from '@/api/mutations';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import type { ActivityLog, BillingMode, Project, Task, TimeEntry } from '@/api/types';
import { fmtClock, fmtHM, fmtHMS, fmtMoneyCents } from '@/utils/format';
import { useNav } from '@/state/stack';
import { useRunning } from '@/state/running';

export function TaskDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [billingDraft, setBillingDraft] = useState<{ mode: BillingMode; rate: string; price: string } | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [entryEdit, setEntryEdit] = useState<TimeEntry | null>(null);
  const [entryDelete, setEntryDelete] = useState<TimeEntry | null>(null);
  const [newSubtaskOpen, setNewSubtaskOpen] = useState(false);
  const { push } = useNav();
  const { elapsed, running, tick, setRunning } = useRunning();

  const load = async () => {
    const t = await api<Task>(`/tasks/${id}`);
    setTask(t);
    setBillingDraft({
      mode: t.billingMode,
      rate: t.hourlyRateCents != null ? (t.hourlyRateCents / 100).toString() : '',
      price: t.taskPriceCents != null ? (t.taskPriceCents / 100).toString() : '',
    });
    const [e, a, p] = await Promise.all([
      api<TimeEntry[]>(`/tasks/${id}/time-entries?descendants=true`),
      api<ActivityLog[]>(`/activity?taskId=${id}&limit=30`),
      api<Project>(`/projects/${t.projectId}`).catch(() => null),
    ]);
    setEntries(e);
    setActivity(a);
    setProject(p);
  };

  useEffect(() => {
    load();
    const offs = [
      onRealtime('task.upserted', (t: Task) => { if (t.id === id) load(); }),
      onRealtime('entry.upserted', load),
      onRealtime('entry.deleted', load),
      onRealtime('timer.started', load),
      onRealtime('timer.stopped', load),
    ];
    const tickId = setInterval(tick, 1000);
    return () => { offs.forEach((o) => o()); clearInterval(tickId); };
  }, [id]);

  if (!task || !billingDraft) return <div className="scroll" style={{ padding: 60 }}>Loading…</div>;

  const isRunning = !!running && running.taskId === task.id;
  const tracked = isRunning ? elapsed : task.totalTime;

  const startStop = async () => {
    // Optimistically flip useRunning so the button reacts instantly. WS events
    // arriving later will reconcile.
    if (isRunning) {
      setRunning(null);
      try { await entriesApi.stopTimer(); } catch { /* offline → optimistic state stays */ }
    } else {
      const optimisticStartedAt = new Date().toISOString();
      setRunning({ entryId: 'pending', taskId: task.id, taskTitle: task.title, startedAt: optimisticStartedAt });
      try {
        const entry = await entriesApi.startTimer(task.id);
        if (entry) setRunning({ entryId: entry.id, taskId: entry.taskId, taskTitle: task.title, startedAt: entry.startedAt });
      } catch { /* keep optimistic state for offline */ }
    }
  };

  const setStatus = async (s: typeof task.status) => {
    await api(`/tasks/${task.id}/status`, { method: 'POST', body: { status: s } });
  };

  const saveBilling = async () => {
    const patch: any = { billingMode: billingDraft.mode };
    if (billingDraft.mode === 'HOURLY_RATE') {
      patch.hourlyRateCents = Math.round(Number(billingDraft.rate || 0) * 100);
      patch.taskPriceCents = null;
    } else if (billingDraft.mode === 'TASK_PRICE') {
      patch.taskPriceCents = Math.round(Number(billingDraft.price || 0) * 100);
      patch.hourlyRateCents = null;
    } else {
      patch.hourlyRateCents = null;
      patch.taskPriceCents = null;
    }
    await api(`/tasks/${task.id}`, { method: 'PATCH', body: patch });
  };

  const deleteEntry = async (eid: string) => {
    if (!confirm('Delete this time entry?')) return;
    await api(`/time-entries/${eid}`, { method: 'DELETE' });
  };

  const closed = task.status === 'DONE' || task.status === 'INVOICED';
  const over = task.estimateSeconds ? tracked > task.estimateSeconds : false;
  const pct = task.estimateSeconds ? (tracked / task.estimateSeconds) * 100 : 0;

  return (
    <>
      <div className="app-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon.ChevronLeft /></button>
        <span className="spacer" />
        <button className="icon-btn" onClick={() => setActionsOpen(true)} aria-label="More"><Icon.More /></button>
      </div>

      <div className="scroll">
        <div className="section">
          {project && (
            <div style={{ marginBottom: 8, fontSize: 12.5 }}>
              <Breadcrumbs
                project={{ id: project.id, name: project.name, colorHex: project.colorHex }}
                ancestors={task.ancestors}
                onProject={(pid) => push({ kind: 'project', id: pid })}
                onTask={(tid) => push({ kind: 'task', id: tid })}
              />
            </div>
          )}
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>
            {task.title} <PriorityFlag urgent={task.urgent} />
          </div>
          <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
            <StatusPill status={task.status} onClick={() => setPicker(true)} />
            {task.dueDate && <span className="pill"><Icon.Calendar size={10} />{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
            <button
              className="pill"
              onClick={() => api(`/tasks/${task.id}`, { method: 'PATCH', body: { urgent: !task.urgent } })}
            >
              <span className="dot" style={{ background: task.urgent ? 'var(--pri-urgent)' : 'var(--text-4)' }} />
              {task.urgent ? 'Urgent' : 'Mark urgent'}
            </button>
          </div>
        </div>

        <div className="section">
          <div className="card hi" style={{ padding: 18 }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: isRunning ? 'var(--accent)' : 'var(--text-3)' }}>
              {isRunning ? 'TRACKING NOW' : 'TIME'}
            </div>
            <div className="bigtimer" style={{ color: isRunning ? 'var(--accent)' : 'var(--text)', marginTop: 10, marginBottom: 12, fontSize: 48 }}>{fmtHMS(tracked)}</div>
            {task.estimateSeconds && (
              <>
                <ProgressBar pct={pct} over={over} />
                <div className="hstack" style={{ justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                  <span>{Math.round(pct)}% of {fmtHM(task.estimateSeconds)}</span>
                  <span className="mono">{fmtHM(Math.max(0, task.estimateSeconds - tracked))} left</span>
                </div>
              </>
            )}
            <div className="hstack" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn primary" onClick={startStop} disabled={closed}>
                {isRunning ? <><Icon.Pause size={14} />Pause</> : <><Icon.Play size={14} />Start timer</>}
              </button>
              <button className="btn" onClick={() => push({ kind: 'manual', taskId: task.id })}>Log manual</button>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>Billing</span></div>
          <div className="card" style={{ padding: 14 }}>
            <div className="hstack" style={{ gap: 6, marginBottom: 10 }}>
              {(['NONE', 'HOURLY_RATE', 'TASK_PRICE'] as BillingMode[]).map((m) => (
                <button
                  key={m}
                  className="seg-btn"
                  style={{
                    flex: 1, height: 32, borderRadius: 8,
                    background: billingDraft.mode === m ? 'var(--accent-tint)' : 'var(--bg-elev-2)',
                    color: billingDraft.mode === m ? 'var(--accent)' : 'var(--text-2)',
                  }}
                  onClick={() => setBillingDraft({ ...billingDraft, mode: m })}
                >
                  {m === 'NONE' ? 'No billing' : m === 'HOURLY_RATE' ? 'Hourly rate' : 'Task price'}
                </button>
              ))}
            </div>
            {billingDraft.mode === 'HOURLY_RATE' && (
              <div className="field" style={{ marginBottom: 8 }}>
                <label>Rate (€/hour)</label>
                <input
                  type="number" min={0} step={1}
                  value={billingDraft.rate}
                  onChange={(e) => setBillingDraft({ ...billingDraft, rate: e.target.value })}
                  onBlur={saveBilling}
                />
              </div>
            )}
            {billingDraft.mode === 'TASK_PRICE' && (
              <div className="field" style={{ marginBottom: 8 }}>
                <label>Fixed price (€)</label>
                <input
                  type="number" min={0} step={1}
                  value={billingDraft.price}
                  onChange={(e) => setBillingDraft({ ...billingDraft, price: e.target.value })}
                  onBlur={saveBilling}
                />
              </div>
            )}
            {(billingDraft.mode !== 'NONE' || task.earnedSoFarCents != null) && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Effective</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{fmtMoneyCents(task.effectiveRateCents)}/h</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Earned</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--st-done)' }}>{fmtMoneyCents(task.earnedSoFarCents)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Projected</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{fmtMoneyCents(task.projectedTotalCents)}</div>
                  </div>
                </div>
                {billingDraft.mode === 'NONE' && task.earnedSoFarCents != null && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                    Rolled up from subtasks
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <span>Subtasks</span>
            <span className="hstack" style={{ gap: 8 }}>
              <span className="count">{task.children.length}</span>
              <button
                className="seg-btn"
                onClick={() => setNewSubtaskOpen(true)}
                style={{ background: 'var(--bg-elev-2)', color: 'var(--text)' }}
              ><Icon.Plus size={11} />Add</button>
            </span>
          </div>
          <div className="card">
            {task.children.map((c) => (
              <NestedTaskRow
                key={c.id}
                task={c}
                expanded={expanded}
                onToggle={(tid) => setExpanded((s) => { const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n; })}
                onOpen={(tid) => push({ kind: 'task', id: tid })}
              />
            ))}
            {task.children.length === 0 && (
              <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
                No subtasks yet. <button className="auth-link" onClick={() => setNewSubtaskOpen(true)}>Add one</button>.
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>Description</span></div>
          <div className="card" style={{ padding: 8 }}>
            <TaskDescriptionEditor task={task} onLocal={(doc) => setTask((t) => t ? { ...t, description: doc } : t)} />
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <span>Time entries</span>
            <span className="hstack" style={{ gap: 8 }}>
              <span className="count">{entries.length}</span>
              <button className="seg-btn" onClick={() => push({ kind: 'manual', taskId: task.id })} style={{ background: 'var(--bg-elev-2)', color: 'var(--text)' }}>
                <Icon.Plus size={11} />Add
              </button>
            </span>
          </div>
          <div className="card">
            {entries.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>No entries yet.</div>
            ) : entries.map((e) => (
              <div key={e.id} className="task" style={{ minHeight: 48 }}>
                {!e.endedAt && <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                <div className="grow">
                  <div className="title-line">
                    <span className="mono">{fmtHM(e.endedAt ? e.durationSeconds : Math.max(0, Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000)))}</span>
                    {e.manual && <span className="pill" style={{ height: 18, fontSize: 9.5 }}>MANUAL</span>}
                    {e.task && e.task.id !== task.id && <span className="muted" style={{ fontSize: 11.5 }}>· {e.task.title}</span>}
                  </div>
                  <div className="meta mono">
                    {fmtClock(new Date(e.startedAt))} – {e.endedAt ? fmtClock(new Date(e.endedAt)) : 'now'}
                    {e.note && <><span className="sep" /><span>{e.note}</span></>}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setEntryEdit(e)} aria-label="Edit"><Icon.Edit size={14} /></button>
                <button className="icon-btn" onClick={() => setEntryDelete(e)} aria-label="Delete"><Icon.Trash size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {activity.length > 0 && (
          <div className="section">
            <div className="section-head"><span>Activity</span><span className="count">{activity.length}</span></div>
            <div className="card" style={{ padding: 12 }}>
              {activity.slice(0, 10).map((a) => (
                <div key={a.id} className="hstack" style={{ padding: '6px 0', fontSize: 12.5, color: 'var(--text-2)' }}>
                  <span className="mono muted">{new Date(a.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <span>
                    {a.kind === 'STATUS_CHANGED' && `Status → ${a.meta?.to}`}
                    {a.kind === 'TASK_CREATED' && 'Task created'}
                    {a.kind === 'MANUAL_ENTRY_ADDED' && 'Manual entry added'}
                    {a.kind === 'COMMENT' && 'Comment'}
                    {a.kind === 'TIME_TRACKED' && 'Time tracked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 120 }} />
      </div>

      {picker && (
        <StatusPicker
          current={task.status}
          onPick={setStatus}
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
          onSaved={load}
        />
      )}

      {moveOpen && (
        <MoveTaskSheet task={task} onClose={() => setMoveOpen(false)} onMoved={load} />
      )}

      {confirmDelete && (
        <ConfirmSheet
          title="Delete task?"
          message={`"${task.title}" and any subtasks + time entries will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={async () => {
            try { await tasksApi.remove(task.id); } catch {}
            onBack();
          }}
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
          onConfirm={async () => {
            try { await entriesApi.remove(entryDelete.id); load(); } catch {}
          }}
          onClose={() => setEntryDelete(null)}
        />
      )}

      {newSubtaskOpen && (
        <QuickAddSheet
          parentTaskId={task.id}
          parentTaskTitle={task.title}
          defaultProjectId={task.projectId}
          onClose={() => { setNewSubtaskOpen(false); load(); }}
        />
      )}
    </>
  );
}

function TaskDescriptionEditor({ task, onLocal }: { task: Task; onLocal: (doc: RichDoc) => void }) {
  const save = useDebouncedCallback((doc: RichDoc) => {
    void tasksApi.update(task.id, { description: doc as Record<string, unknown> });
  }, 600);
  return (
    <RichEditor
      value={(task.description as RichDoc | null) ?? null}
      placeholder="Add a description…"
      onChange={(doc) => { onLocal(doc); save(doc); }}
    />
  );
}
