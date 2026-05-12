import { useState } from 'react';
import { Icon } from './Icon';
import { api } from '@/api/client';

interface Props {
  project: { id: string; name: string };
  onClose: () => void;
  onDeleted: () => void;
}

// Type-to-confirm dialog. The Delete button stays disabled until the user
// types the exact project name (case-sensitive) — same pattern as GitHub /
// Linear / Vercel destructive flows. Backend cascades to tasks + entries
// via the Prisma onDelete: Cascade chain.
export function DeleteProjectModal({ project, onClose, onDeleted }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const matches = input === project.name;
  const canDelete = matches && !busy;

  const submit = async () => {
    if (!canDelete) return;
    setBusy(true); setErr(null);
    try {
      await api(`/projects/${project.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e: any) {
      setErr(e?.message ?? 'Delete failed');
      setBusy(false);
    }
  };

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 18px 60px rgba(0, 0, 0, 0.55)',
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'color-mix(in oklab, var(--pri-urgent) 18%, transparent)',
            color: 'var(--pri-urgent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon.Trash size={18} />
          </span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>Delete project</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>This action cannot be undone.</div>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 16px' }}>
          Deleting <strong style={{ color: 'var(--text)' }}>{project.name}</strong> will permanently remove
          the project, every task and subtask in it, and every time entry tracked against those tasks.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={{
            display: 'block', marginBottom: 6,
            fontSize: 10.5, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-3)',
          }}>
            Type the project name to confirm
          </label>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canDelete && submit()}
            placeholder={project.name}
            spellCheck={false}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-elev-2)',
              border: `1px solid ${input.length > 0 && !matches ? 'var(--pri-urgent)' : 'var(--border)'}`,
              borderRadius: 8,
              fontSize: 14,
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              transition: 'border-color .15s',
            }}
          />
        </div>

        {err && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'color-mix(in oklab, var(--pri-urgent) 14%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pri-urgent) 28%, transparent)',
            color: '#ffb3a8', fontSize: 12.5,
            marginBottom: 12,
          }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            onClick={submit}
            disabled={!canDelete}
            style={{
              height: 40, padding: '0 14px', borderRadius: 12,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid transparent',
              background: canDelete ? 'var(--pri-urgent)' : 'var(--bg-elev-2)',
              color: canDelete ? '#fff' : 'var(--text-4)',
              fontSize: 13, fontWeight: 500,
              cursor: canDelete ? 'pointer' : 'not-allowed',
              transition: 'background .15s',
            }}
          >
            <Icon.Trash size={13} />
            {busy ? 'Deleting…' : 'Delete project'}
          </button>
        </div>
      </div>
    </div>
  );
}
