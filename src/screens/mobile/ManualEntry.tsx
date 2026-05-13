import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { TimeEntry } from '@/api/types';
import { fmtHMS } from '@/utils/format';

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

type Mode = 'duration' | 'range';

export function ManualEntryScreen({ entryId, taskId, onBack }: { entryId?: string; taskId?: string; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('duration');
  const [start, setStart] = useState(toLocalInput(new Date()));
  const [end, setEnd] = useState(toLocalInput(new Date()));
  // Duration-mode inputs:
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
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
      // Editing existing entries always uses range mode because the start
      // and end were already chosen by the user / by the timer.
      setMode('range');
    })();
  }, [entryId]);

  const durationSecs = mode === 'range'
    ? Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000))
    : Math.max(0, (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60);

  const save = async () => {
    if (!taskRef && !editing) return;

    // For duration-mode new entries: derive [end = now, start = now - duration].
    let startISO: string;
    let endISO: string | null;
    if (mode === 'duration' && !editing) {
      const now = new Date();
      const startedAt = new Date(now.getTime() - durationSecs * 1000);
      startISO = startedAt.toISOString();
      endISO = now.toISOString();
    } else {
      startISO = new Date(start).toISOString();
      endISO = end ? new Date(end).toISOString() : null;
    }

    if (editing) {
      await api(`/time-entries/${editing.id}`, {
        method: 'PATCH',
        body: { startedAt: startISO, endedAt: endISO, note },
      });
    } else {
      await api('/time-entries', {
        method: 'POST',
        body: { taskId: taskRef, startedAt: startISO, endedAt: endISO, note },
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
        {!editing && (
          <div className="section">
            <div className="hstack" style={{ gap: 6 }}>
              {(['duration', 'range'] as Mode[]).map((m) => (
                <button
                  key={m}
                  className="seg-btn"
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, height: 36,
                    background: mode === m ? 'var(--accent-tint)' : 'var(--bg-elev-2)',
                    color: mode === m ? 'var(--accent)' : 'var(--text-2)',
                    borderRadius: 10, fontSize: 13, fontWeight: 500,
                  }}
                >
                  {m === 'duration' ? 'Just duration' : 'Pick start + end'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="section">
          <div className="card" style={{ padding: 14 }}>
            {mode === 'duration' && !editing ? (
              <>
                <div className="hstack" style={{ gap: 10, alignItems: 'flex-end' }}>
                  <NumberField label="Hours" value={hours} onChange={setHours} min={0} max={24} />
                  <NumberField label="Minutes" value={minutes} onChange={setMinutes} min={0} max={59} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 12 }}>
                  Will log <span className="mono" style={{ color: 'var(--text-2)' }}>{fmtHMS(durationSecs)}</span> ending now ({new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}).
                </div>
              </>
            ) : (
              <>
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
                  <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{fmtHMS(durationSecs)}</span>
                </div>
              </>
            )}
          </div>
        </div>

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

function NumberField({ label, value, onChange, min, max }: { label: string; value: string; onChange: (v: string) => void; min: number; max: number }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mono"
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-elev-2)',
          color: 'var(--text)',
          borderRadius: 10,
          fontSize: 22,
          fontWeight: 600,
          textAlign: 'center',
          border: 'none',
          outline: 'none',
        }}
      />
    </div>
  );
}
