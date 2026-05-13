import { useState } from 'react';
import { Icon } from '../Icon';
import { StatusPill, StatusPicker } from '../Status';
import { PriorityFlag } from '../PriorityFlag';
import { api } from '@/api/client';
import type { Status, Task } from '@/api/types';

interface Props {
  task: Task;
  onClose: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onSaved?: () => void;
}

// Ported from sheets.jsx > EditTaskSheet. Adapted to my urgent-only flag
// (no 4-tier priority picker) and to backend's seconds/date types.
export function EditTaskSheet({ task, onClose, onMove, onDelete, onSaved }: Props) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<Status>(task.status);
  const [urgent, setUrgent] = useState(task.urgent);
  const [estimateHrs, setEstimateHrs] = useState(((task.estimateSeconds ?? 0) / 3600).toString());
  const [due, setDue] = useState(task.dueDate ? task.dueDate.slice(0, 10) : '');
  const [pickStatus, setPickStatus] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSave = title.trim().length > 0 && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    const hrs = parseFloat(estimateHrs);
    const patch: any = {
      title: title.trim(),
      status,
      urgent,
      estimateSeconds: isNaN(hrs) ? null : Math.round(hrs * 3600),
      dueDate: due ? new Date(due).toISOString() : null,
    };
    try {
      await api(`/tasks/${task.id}`, { method: 'PATCH', body: patch });
      onSaved?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 24 }}>
        <div className="sheet-grab" />
        <SheetHeader title="Edit task" onCancel={onClose} onSave={save} canSave={canSave} />

        <div style={{ padding: '0 20px 4px' }}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            style={{
              width: '100%', fontSize: 19, fontWeight: 500, letterSpacing: '-0.02em',
              background: 'transparent', border: 'none', color: 'var(--text)',
              outline: 'none', padding: '4px 0',
            }}
          />
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          <div className="card">
            <FieldRow label="Status">
              <button
                onClick={() => setPickStatus(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none' }}
              >
                <StatusPill status={status} />
                <Icon.ChevronRight size={12} />
              </button>
            </FieldRow>
            <FieldRow label="Urgent">
              <button
                onClick={() => setUrgent((v) => !v)}
                style={{
                  width: 36, height: 22, borderRadius: 999,
                  background: urgent ? 'var(--pri-urgent)' : 'var(--bg-elev-2)',
                  position: 'relative', border: 'none',
                }}
                aria-pressed={urgent}
              >
                <span style={{
                  position: 'absolute', top: 2, left: urgent ? 16 : 2,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left .15s',
                }} />
              </button>
              {urgent && <PriorityFlag urgent />}
            </FieldRow>
            <FieldRow label="Estimate">
              <input
                type="number" min="0" step="0.25" value={estimateHrs}
                onChange={(e) => setEstimateHrs(e.target.value)}
                className="mono"
                style={{
                  width: 70, fontSize: 14, textAlign: 'right',
                  background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>hours</span>
            </FieldRow>
            <FieldRow label="Due" isLast>
              <input
                type="date" value={due}
                onChange={(e) => setDue(e.target.value)}
                style={{
                  fontSize: 13, textAlign: 'right',
                  background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </FieldRow>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {onMove && (
              <button className="btn lg" style={{ flex: 1 }} onClick={() => { onClose(); onMove(); }}>
                Move to…
              </button>
            )}
            {onDelete && (
              <button
                className="btn lg"
                onClick={() => { onClose(); onDelete(); }}
                style={{
                  color: 'var(--st-return)',
                  borderColor: 'color-mix(in oklab, var(--st-return) 30%, transparent)',
                }}
              >
                <Icon.Trash size={14} /> Delete
              </button>
            )}
          </div>
        </div>

        {pickStatus && (
          <StatusPicker
            current={status}
            onPick={(s) => setStatus(s)}
            onClose={() => setPickStatus(false)}
          />
        )}
      </div>
    </div>
  );
}

// Shared field row + sheet header — local to the sheets/ folder for now;
// later we can hoist them if other sheets need them.
function FieldRow({ label, children, isLast }: { label: string; children: React.ReactNode; isLast?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', minHeight: 48,
        borderBottom: isLast ? 0 : '1px solid var(--line)',
      }}
    >
      <span style={{
        fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase',
        letterSpacing: '0.04em', fontWeight: 600,
      }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</span>
    </div>
  );
}

function SheetHeader({
  title, onCancel, onSave, canSave,
}: {
  title: string; onCancel: () => void; onSave: () => void; canSave: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 20px 14px',
    }}>
      <button onClick={onCancel} style={{ color: 'var(--text-3)', fontSize: 14 }}>Cancel</button>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      <button
        onClick={onSave} disabled={!canSave}
        style={{ color: canSave ? 'var(--accent)' : 'var(--text-4)', fontSize: 14, fontWeight: 600 }}
      >
        Save
      </button>
    </div>
  );
}
