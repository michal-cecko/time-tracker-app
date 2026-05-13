import { useState } from 'react';
import { Icon } from '../Icon';
import { entries as entriesApi } from '@/api/mutations';
import { fmtHMS } from '@/utils/format';
import type { TimeEntry } from '@/api/types';

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

interface Props {
  entry: TimeEntry;
  onClose: () => void;
  onDeleteRequest?: () => void;
}

export function EditEntrySheet({ entry, onClose, onDeleteRequest }: Props) {
  const [start, setStart] = useState(toLocalInput(new Date(entry.startedAt)));
  const [end, setEnd] = useState(entry.endedAt ? toLocalInput(new Date(entry.endedAt)) : '');
  const [note, setNote] = useState(entry.note ?? '');
  const [busy, setBusy] = useState(false);

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const durationSecs = endDate
    ? Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000))
    : entry.durationSeconds;

  const save = async () => {
    setBusy(true);
    try {
      await entriesApi.update(entry.id, {
        startedAt: startDate.toISOString(),
        endedAt: endDate ? endDate.toISOString() : null,
        note,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 24 }}>
        <div className="sheet-grab" />
        <SheetHeader title="Edit time entry" onCancel={onClose} onSave={save} canSave={!busy} />

        <div style={{ padding: '0 16px' }}>
          <div className="card">
            <FieldRow label="Start">
              <input
                type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
                className="mono"
                style={{ fontSize: 13, textAlign: 'right', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', colorScheme: 'dark' }}
              />
            </FieldRow>
            <FieldRow label="End">
              <input
                type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
                className="mono"
                style={{ fontSize: 13, textAlign: 'right', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', colorScheme: 'dark' }}
              />
            </FieldRow>
            <FieldRow label="Duration" isLast>
              <span className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{fmtHMS(durationSecs)}</span>
            </FieldRow>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>Note</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you do? (optional)"
              rows={3}
              style={{ width: '100%', fontSize: 13, lineHeight: 1.5, resize: 'none', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none' }}
            />
          </div>

          {onDeleteRequest && (
            <button
              onClick={() => { onClose(); onDeleteRequest(); }}
              className="btn lg"
              style={{
                width: '100%', marginTop: 14,
                color: 'var(--st-return)',
                borderColor: 'color-mix(in oklab, var(--st-return) 30%, transparent)',
              }}
            >
              <Icon.Trash size={14} /> Delete entry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children, isLast }: { label: string; children: React.ReactNode; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', minHeight: 48,
      borderBottom: isLast ? 0 : '1px solid var(--line)',
    }}>
      <span style={{
        fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase',
        letterSpacing: '0.04em', fontWeight: 600,
      }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</span>
    </div>
  );
}

function SheetHeader({ title, onCancel, onSave, canSave }: { title: string; onCancel: () => void; onSave: () => void; canSave: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px' }}>
      <button onClick={onCancel} style={{ color: 'var(--text-3)', fontSize: 14 }}>Cancel</button>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      <button onClick={onSave} disabled={!canSave} style={{ color: canSave ? 'var(--accent)' : 'var(--text-4)', fontSize: 14, fontWeight: 600 }}>Save</button>
    </div>
  );
}
