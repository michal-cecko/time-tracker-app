import type { CSSProperties } from 'react';
import { STATUS_META, STATUS_ORDER, type Status } from '@/api/types';

export function StatusDot({ status, size = 12 }: { status: Status; size?: number }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`ring ${meta.ring}`}
      style={{
        '--c': meta.hex,
        width: size, height: size,
        borderRadius: '50%',
        background: meta.ring === 'dashed' ? 'transparent' : `color-mix(in oklab, ${meta.hex} 22%, transparent)`,
        border: `1.5px solid ${meta.hex}`,
        borderStyle: meta.ring === 'dashed' ? 'dashed' : 'solid',
        display: 'inline-block',
        position: 'relative',
        flexShrink: 0,
      } as CSSProperties}
    >
      {meta.ring === 'check' && (
        <span style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: meta.hex }} />
      )}
      {meta.ring === 'solid' && (
        <span style={{ position: 'absolute', inset: 1.5, borderRadius: '50%', background: meta.hex }} />
      )}
    </span>
  );
}

export function StatusPill({ status, onClick }: { status: Status; onClick?: () => void }) {
  const meta = STATUS_META[status];
  return (
    <button className="st" style={{ '--c': meta.hex } as CSSProperties} onClick={onClick} aria-label={meta.label}>
      <span className={`ring ${meta.ring}`} />
      <span>{meta.label}</span>
    </button>
  );
}

export function StatusPicker({
  current,
  onPick,
  onClose,
}: {
  current: Status;
  onPick: (s: Status) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <div className="sheet-title">Status</div>
        {STATUS_ORDER.map((s) => {
          const meta = STATUS_META[s];
          return (
            <div
              key={s}
              className={`st-option ${s === current ? 'active' : ''}`}
              onClick={() => { onPick(s); onClose(); }}
              style={{ '--c': meta.hex } as CSSProperties}
            >
              <span className={`ring ${meta.ring}`} style={{
                width: 16, height: 16, borderRadius: '50%',
                border: `1.5px solid ${meta.hex}`,
                background: meta.ring === 'dashed' ? 'transparent' : `color-mix(in oklab, ${meta.hex} 22%, transparent)`,
                borderStyle: meta.ring === 'dashed' ? 'dashed' : 'solid',
                display: 'inline-block', position: 'relative',
              }}>
                {meta.ring === 'check' && (
                  <span style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: meta.hex }} />
                )}
                {meta.ring === 'solid' && (
                  <span style={{ position: 'absolute', inset: 1.5, borderRadius: '50%', background: meta.hex }} />
                )}
              </span>
              <span>{meta.label}</span>
              <span className="right">{s === current && <span style={{ color: 'var(--accent)' }}>✓</span>}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
