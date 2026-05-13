import type { ReactNode } from 'react';

export interface Action {
  label: string;
  sub?: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

interface Props {
  title?: string;
  subtitle?: string;
  actions: Action[];
  onClose: () => void;
}

// Ported from the prototype's sheets.jsx — generic bottom-sheet menu with
// icon-prefixed action rows and a "Cancel" footer. Used for the ⋯ menus on
// tasks, projects and entries.
export function ActionSheet({ title, subtitle, actions, onClose }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        {(title || subtitle) && (
          <div style={{ padding: '4px 20px 12px' }}>
            {title && <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>}
            {subtitle && (
              <div style={{
                fontSize: 12, color: 'var(--text-3)', marginTop: 4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{subtitle}</div>
            )}
          </div>
        )}
        <div style={{ padding: '4px 8px' }}>
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { onClose(); a.onClick?.(); }}
              disabled={a.disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'transparent', border: 'none', textAlign: 'left',
                color: a.danger ? 'var(--st-return)' : 'var(--text)',
                fontSize: 14, fontWeight: 500,
                opacity: a.disabled ? 0.4 : 1,
                cursor: a.disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{
                width: 30, height: 30, borderRadius: 8,
                background: a.danger
                  ? 'color-mix(in oklab, var(--st-return) 14%, transparent)'
                  : 'var(--bg-elev-2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: a.danger ? 'var(--st-return)' : 'var(--text-2)', flexShrink: 0,
              }}>{a.icon}</span>
              <span style={{ flex: 1 }}>
                {a.label}
                {a.sub && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontWeight: 400 }}>
                    {a.sub}
                  </div>
                )}
              </span>
            </button>
          ))}
        </div>
        <div style={{ padding: '8px 16px 0' }}>
          <button onClick={onClose} className="btn lg" style={{ width: '100%' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
