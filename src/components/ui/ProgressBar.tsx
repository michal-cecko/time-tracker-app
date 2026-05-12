import type { CSSProperties } from 'react';

export function ProgressBar({ pct, over = false }: { pct: number; over?: boolean }) {
  const fill = over ? 'var(--pri-urgent)' : 'var(--st-done)';
  return (
    <div style={{
      height: 6, background: 'var(--bg-elev-2)', borderRadius: 999, overflow: 'hidden',
    }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: fill, transition: 'width .2s' } as CSSProperties} />
    </div>
  );
}

export function RingProgress({ pct, over = false, size = 240 }: { pct: number; over?: boolean; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, pct) / 100) * c;
  const color = over ? 'var(--pri-urgent)' : 'var(--accent)';
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-elev-2)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
