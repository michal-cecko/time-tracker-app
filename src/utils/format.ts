export function fmtHMS(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtHM(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function pctOf(num: number, denom: number): number {
  if (!denom) return 0;
  return Math.min(100, Math.round((num / denom) * 100));
}

export function fmtMoneyCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function fmtClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fmtRelative(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - dd.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
