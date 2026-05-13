import { useEffect, useState } from 'react';
import { projects as projectsApi } from '@/api/mutations';
import type { Project } from '@/api/types';

const COLOR_OPTIONS = [
  '#ff7a45', '#e5b341', '#34c270', '#4a7eff', '#a464d9',
  '#c97064', '#6b8e7a', '#8f6e57', '#e54336', '#7a7468',
];

interface Props {
  project?: Project | null;  // null/undefined → create new
  onClose: () => void;
  onSaved?: (project: Project) => void;
}

export function EditProjectSheet({ project, onClose, onSaved }: Props) {
  const isNew = !project;
  const [name, setName] = useState(project?.name ?? '');
  const [initials, setInitials] = useState(project?.initials ?? '');
  const [color, setColor] = useState(project?.colorHex ?? COLOR_OPTIONS[0]);
  const [busy, setBusy] = useState(false);

  // Auto-derive initials from name when creating new and the user hasn't typed any.
  useEffect(() => {
    if (!isNew) return;
    if (initials.length > 0) return;
    const auto = name.split(/[\s—–-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
    if (auto) setInitials(auto.slice(0, 2));
  }, [name, isNew, initials.length]);

  const canSave = name.trim().length > 0 && initials.trim().length > 0 && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const patch = {
        name: name.trim(),
        initials: initials.trim().toUpperCase().slice(0, 2),
        colorHex: color,
      };
      const saved = isNew
        ? await projectsApi.create(patch)
        : await projectsApi.update(project!.id, patch);
      onSaved?.(saved);
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 24 }}>
        <div className="sheet-grab" />
        <SheetHeader title={isNew ? 'New project' : 'Edit project'} onCancel={onClose} onSave={save} canSave={canSave} />

        <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(0,0,0,0.85)', fontWeight: 600, fontSize: 18, fontFamily: 'var(--font-mono)',
          }}>{(initials || '??').slice(0, 2).toUpperCase()}</div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            style={{
              flex: 1, fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em',
              background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none',
            }}
          />
        </div>

        <div style={{ padding: '8px 16px' }}>
          <div className="card">
            <FieldRow label="Initials">
              <input
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className="mono"
                style={{
                  width: 60, fontSize: 14, textAlign: 'right',
                  background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none',
                  textTransform: 'uppercase', letterSpacing: '0.02em',
                }}
              />
            </FieldRow>
            <FieldRow label="Color" isLast>
              <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 200,
              }}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: 6, background: c, border: 'none',
                      cursor: 'pointer',
                      outline: color === c ? '2px solid var(--text)' : '1px solid var(--line)',
                      outlineOffset: color === c ? 1 : 0,
                    }}
                  />
                ))}
              </div>
            </FieldRow>
          </div>
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
