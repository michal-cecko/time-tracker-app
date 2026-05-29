import { useState } from 'react';
import { entries as entriesApi } from '@/api/mutations';
import { fmtHMS } from '@/utils/format';

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

type Mode = 'duration' | 'range';

interface Props {
  taskId: string;
  onClose: () => void;
}

export function LogEntrySheet({ taskId, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('duration');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [start, setStart] = useState(toLocalInput(new Date()));
  const [end, setEnd] = useState(toLocalInput(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const durationSecs = mode === 'duration'
    ? Math.max(0, (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60)
    : Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));

  const canSave = durationSecs > 0 && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      let startISO: string;
      let endISO: string;
      if (mode === 'duration') {
        const now = new Date();
        startISO = new Date(now.getTime() - durationSecs * 1000).toISOString();
        endISO = now.toISOString();
      } else {
        startISO = new Date(start).toISOString();
        endISO = new Date(end).toISOString();
      }
      await entriesApi.createManual(taskId, startISO, endISO, note || undefined);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 24 }}>
        <div className="sheet-grab" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px' }}>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: 14 }}>Cancel</button>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Log time</span>
          <button onClick={save} disabled={!canSave} style={{ color: canSave ? 'var(--accent)' : 'var(--text-4)', fontSize: 14, fontWeight: 600 }}>Save</button>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['duration', 'range'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, height: 34,
                  background: mode === m ? 'var(--accent-tint)' : 'var(--bg-elev-2)',
                  color: mode === m ? 'var(--accent)' : 'var(--text-2)',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                }}
              >
                {m === 'duration' ? 'Duration' : 'Start + End'}
              </button>
            ))}
          </div>

          <div className="card">
            {mode === 'duration' ? (
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Hours</div>
                    <input
                      type="number" min={0} max={24} value={hours} placeholder="0"
                      onChange={(e) => setHours(e.target.value)}
                      className="mono"
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elev-2)', color: 'var(--text)', borderRadius: 8, fontSize: 20, fontWeight: 600, textAlign: 'center', border: 'none', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Minutes</div>
                    <input
                      type="number" min={0} max={59} value={minutes} placeholder="30"
                      onChange={(e) => setMinutes(e.target.value)}
                      className="mono"
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elev-2)', color: 'var(--text)', borderRadius: 8, fontSize: 20, fontWeight: 600, textAlign: 'center', border: 'none', outline: 'none' }}
                    />
                  </div>
                </div>
                {durationSecs > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
                    Will log <span className="mono" style={{ color: 'var(--accent)' }}>{fmtHMS(durationSecs)}</span> ending now
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', minHeight: 48, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Start</span>
                  <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="mono" style={{ fontSize: 13, textAlign: 'right', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', colorScheme: 'dark' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', minHeight: 48, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>End</span>
                  <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="mono" style={{ fontSize: 13, textAlign: 'right', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', colorScheme: 'dark' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', minHeight: 48 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Duration</span>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{fmtHMS(durationSecs)}</span>
                </div>
              </>
            )}
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
        </div>
      </div>
    </div>
  );
}
