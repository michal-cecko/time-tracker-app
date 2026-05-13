import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusPill, StatusPicker } from '@/components/ui/Status';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ActionSheet } from '@/components/ui/sheets/ActionSheet';
import { ConfirmSheet } from '@/components/ui/sheets/ConfirmSheet';
import { EditTaskSheet } from '@/components/ui/sheets/EditTaskSheet';
import { MoveTaskSheet } from '@/components/ui/sheets/MoveTaskSheet';
import { EditEntrySheet } from '@/components/ui/sheets/EditEntrySheet';
import { api } from '@/api/client';
import { onRealtime } from '@/api/websocket';
import { tasks as tasksApi, entries as entriesApi } from '@/api/mutations';
import type { Task, TimeEntry } from '@/api/types';
import { fmtClock, fmtHM, fmtHMS, fmtMoneyCents } from '@/utils/format';
import { useRunning } from '@/state/running';

export function Inspector({ taskId, onClear }: { taskId: string | null; onClear: () => void }) {
  const [task, setTask] = useState<Task | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [picker, setPicker] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [entryEdit, setEntryEdit] = useState<TimeEntry | null>(null);
  const [entryDelete, setEntryDelete] = useState<TimeEntry | null>(null);
  const { running, elapsed, tick } = useRunning();

  const load = async (id: string) => {
    setTask(await api<Task>(`/tasks/${id}`));
    setEntries(await api<TimeEntry[]>(`/tasks/${id}/time-entries?descendants=true`));
  };
  useEffect(() => {
    if (!taskId) { setTask(null); setEntries([]); return; }
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
      <div className="dt-empty">
        <Icon.Folder size={28} />
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-3)' }}>Select a task</div>
      </div>
    );
  }

  const isRunning = !!running && running.taskId === task.id;
  const tracked = isRunning ? elapsed : task.totalTime;
  const over = task.estimateSeconds ? tracked > task.estimateSeconds : false;
  const pct = task.estimateSeconds ? (tracked / task.estimateSeconds) * 100 : 0;

  return (
    <div style={{ padding: 18 }}>
      <div className="hstack" style={{ marginBottom: 10 }}>
        <span className="spacer" />
        <button className="icon-btn" onClick={() => setActionsOpen(true)} aria-label="Task actions"><Icon.More size={14} /></button>
        <button className="icon-btn" onClick={onClear} aria-label="Close"><Icon.X size={14} /></button>
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{task.title} <PriorityFlag urgent={task.urgent} /></div>
      <div className="hstack" style={{ gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusPill status={task.status} onClick={() => setPicker(true)} />
        {task.dueDate && <span className="pill"><Icon.Calendar size={10} />{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
      </div>

      <div className="card hi" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, color: isRunning ? 'var(--accent)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{isRunning ? 'TRACKING NOW' : 'TIME'}</div>
        <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: isRunning ? 'var(--accent)' : 'var(--text)', marginTop: 6, marginBottom: 10 }}>{fmtHMS(tracked)}</div>
        {task.estimateSeconds && (
          <>
            <ProgressBar pct={pct} over={over} />
            <div className="hstack" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
              <span>{Math.round(pct)}% of {fmtHM(task.estimateSeconds)}</span>
            </div>
          </>
        )}
        <button className="btn primary" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={async () => {
          if (isRunning) await api('/time-entries/stop', { method: 'POST' });
          else await api('/time-entries/start', { method: 'POST', body: { taskId: task.id } });
        }}>
          {isRunning ? <><Icon.Pause size={14} />Pause</> : <><Icon.Play size={14} />Start timer</>}
        </button>
      </div>

      {task.billingMode !== 'NONE' && (
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Billing</div>
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>{task.billingMode === 'HOURLY_RATE' ? 'Hourly rate' : 'Fixed price'}</span>
            <span className="mono">{fmtMoneyCents(task.billingMode === 'HOURLY_RATE' ? task.hourlyRateCents : task.taskPriceCents)}</span>
          </div>
          <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
            <span>Earned</span><span className="mono">{fmtMoneyCents(task.earnedSoFarCents)}</span>
          </div>
          <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>
            <span>Effective</span><span className="mono">{fmtMoneyCents(task.effectiveRateCents)}/h</span>
          </div>
        </div>
      )}

      {task.children.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Subtasks · {task.children.length}</div>
          <div className="card">
            {task.children.map((c) => (
              <div key={c.id} className="task" style={{ minHeight: 40 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.running ? 'var(--accent)' : 'var(--text-4)' }} />
                <div className="grow"><div className="title-line">{c.title}</div></div>
                <span className="mono" style={{ fontSize: 11 }}>{fmtHM(c.totalTime)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Entries · {entries.length}</div>
          <div className="card">
            {entries.slice(0, 8).map((e) => (
              <div key={e.id} className="task" style={{ minHeight: 40 }}>
                <span className="mono" style={{ fontSize: 12, color: !e.endedAt ? 'var(--accent)' : 'var(--text)' }}>{fmtHM(e.endedAt ? e.durationSeconds : Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000))}</span>
                <div className="grow"><div className="meta mono">{fmtClock(new Date(e.startedAt))} – {e.endedAt ? fmtClock(new Date(e.endedAt)) : 'now'}</div></div>
                {e.manual && <span className="pill" style={{ height: 18, fontSize: 9 }}>M</span>}
                <button className="icon-btn" onClick={() => setEntryEdit(e)} aria-label="Edit"><Icon.Edit size={12} /></button>
                <button className="icon-btn" onClick={() => setEntryDelete(e)} aria-label="Delete"><Icon.Trash size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {picker && (
        <StatusPicker current={task.status} onPick={async (s) => { await tasksApi.setStatus(task.id, s); }} onClose={() => setPicker(false)} />
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
          onConfirm={async () => {
            try { await tasksApi.remove(task.id); onClear(); } catch {}
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
            try { await entriesApi.remove(entryDelete.id); if (taskId) load(taskId); } catch {}
          }}
          onClose={() => setEntryDelete(null)}
        />
      )}
    </div>
  );
}
