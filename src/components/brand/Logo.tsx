// Lapse — stopwatch logo, ported from the design HTML's SVG.
//
// Two surfaces:
//   <LogoMark />  — just the stopwatch glyph, scales to any size. Use the
//                   `tone` prop to swap between bright-bg ("dark") and dark-bg
//                   ("light") face colours.
//   <LogoTile />  — the rounded-square app-icon variant with a dark canvas
//                   behind the mark. Used on the login screen.

interface MarkProps {
  size?: number;
  /** "light" = cream face on dark bg (default).  "dark" = ink face on light bg. */
  tone?: 'light' | 'dark';
  accent?: string;
  className?: string;
}

export function LogoMark({ size = 64, tone = 'light', accent = 'var(--accent)', className }: MarkProps) {
  const ink = tone === 'light' ? '#f3efe9' : '#1a1816';
  const tickAlpha = tone === 'light' ? 0.32 : 0.22;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 160 170"
      fill="none"
      aria-label="Lapse"
      className={className}
    >
      <rect x="68" y="6" width="24" height="14" rx="3" fill={ink} />
      <rect x="74" y="18" width="12" height="8" fill={ink} />
      <rect x="14" y="32" width="16" height="10" rx="2" fill={ink} transform="rotate(-30 22 37)" />
      <rect x="130" y="32" width="16" height="10" rx="2" fill={ink} transform="rotate(30 138 37)" />
      <circle cx="80" cy="95" r="62" stroke={ink} strokeWidth="6" fill="none" />
      <g stroke={ink} strokeOpacity={tickAlpha} strokeLinecap="round">
        <line x1="80" y1="47" x2="80" y2="39" strokeWidth="3.2" />
        <line x1="105.5" y1="50.83" x2="108" y2="46.5" strokeWidth="1.6" />
        <line x1="124.17" y1="69.5" x2="128.5" y2="67" strokeWidth="1.6" />
        <line x1="128" y1="95" x2="136" y2="95" strokeWidth="3.2" />
        <line x1="124.17" y1="120.5" x2="128.5" y2="123" strokeWidth="1.6" />
        <line x1="105.5" y1="139.17" x2="108" y2="143.5" strokeWidth="1.6" />
        <line x1="80" y1="143" x2="80" y2="151" strokeWidth="3.2" />
        <line x1="54.5" y1="139.17" x2="52" y2="143.5" strokeWidth="1.6" />
        <line x1="35.83" y1="120.5" x2="31.5" y2="123" strokeWidth="1.6" />
        <line x1="32" y1="95" x2="24" y2="95" strokeWidth="3.2" />
        <line x1="35.83" y1="69.5" x2="31.5" y2="67" strokeWidth="1.6" />
        <line x1="54.5" y1="50.83" x2="52" y2="46.5" strokeWidth="1.6" />
      </g>
      <line x1="80" y1="95" x2="118" y2="60" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      <circle cx="80" cy="95" r="6" fill={ink} />
      <circle cx="80" cy="95" r="2.5" fill={accent} />
    </svg>
  );
}

export function LogoTile({ size = 72 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: '#100f0d',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <LogoMark size={Math.round(size * 0.78)} tone="light" />
    </span>
  );
}
