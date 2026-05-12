import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';
import { fmtHM, fmtHMS } from '@/utils/format';

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ManualEntryScreen({ entryId, taskId, onBack }: { entryId?: string; taskId?: string; onBack: () => void }) {
  const [start, setStart] = useState(toLocalInput(new Date()));
  const [end, setEnd] = useState(toLocalInput(new Date()));
  const [note, setNote] = useState('');
  const [taskRef, setTaskRef] = useState<string | undefined>(taskId);
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  useEffect(() => {
    if (!entryId) return;
    (async () => {
      const list = await api<TimeEntry[]>(`/time-entries`);
      const e = list.find((x) => x.id === entryId);
      if (!e) return;
      setEditing(e);
      setStart(toLocalInput(new Date(e.startedAt)));
      if (e.endedAt) setEnd(toLocalInput(new Date(e.endedAt)));
      setNote(e.note ?? '');
      setTaskRef(e.taskId);
    })();
  }, [entryId]);

  const duration = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));

  const save = async () => {
    if (!taskRef && !editing) return;
    if (editing) {
      await api(`/time-entries/${editing.id}`, {
        method: 'PATCH',
        body: { startedAt: new Date(start).toISOString(), endedAt: new Date(end).toISOString(), note },
      });
    } else {
      await api('/time-entries', {
        method: 'POST',
        body: { taskId: taskRef, startedAt: new Date(start).toISOString(), endedAt: new Date(end).toISOString(), note },
      });
    }
    onBack();
  };

  const remove = async () => {
    if (!editing) return;
    if (!confirm('Delete this entry?')) return;
    await api(`/time-entries/${editing.id}`, { method: 'DELETE' });
    onBack();
  };

  return (
    <>
      <div className="app-header">
        <button className="auth-link" onClick={onBack}>Cancel</button>
        <span className="spacer" />
        <button className="auth-link" onClick={save} disabled={!taskRef && !editing} style={{ fontWeight: 600 }}>Save</button>
      </div>
      <div className="scroll">
        <div className="section"><div className="card" style={{ padding: 14 }}>
          <div className="field" style={{ background: 'transparent', border: 0, padding: 0, marginBottom: 12 }}>
            <label>Start</label>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field" style={{ background: 'transparent', border: 0, padding: 0, marginBottom: 12 }}>
            <label>End</label>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Duration</span>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{fmtHMS(duration)}</span>
          </div>
        </div></div>

        <div className="section">
          <div className="card" style={{ padding: 14 }}>
            <label style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Note</label>
            <textarea
              placeholder="Optional…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: 10, background: 'var(--bg-elev-2)', borderRadius: 8, color: 'var(--text)', minHeight: 80, resize: 'vertical', fontSize: 14 }}
            />
          </div>
        </div>

        {editing && (
          <div className="section">
            <button className="btn" onClick={remove} style={{ width: '100%', color: 'var(--pri-urgent)' }}>
              <Icon.Trash size={14} />Delete entry
            </button>
          </div>
        )}
        <div style={{ height: 120 }} />
      </div>
    </>
  );
}
