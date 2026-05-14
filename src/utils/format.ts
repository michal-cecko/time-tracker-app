export function fmtHMS(secs: number | null | undefined): string {
  const n = Number.isFinite(secs as number) ? (secs as number) : 0;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = Math.floor(n % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtHM(secs: number | null | undefined): string {
  const n = Number.isFinite(secs as number) ? (secs as number) : 0;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Compact "rounded hours" — matches the prototype's rail format. Rounds up
// to the nearest whole hour for anything > 0 (so 6m → "1h" is wrong; use
// fmtHM for fine-grained). For project tile metadata only.
export function fmtHoursShort(secs: number): string {
  if (secs <= 0) return '0h';
  const totalMin = secs / 60;
  if (totalMin < 60) return `${Math.round(totalMin)}m`;
  return `${Math.round(totalMin / 60)}h`;
}

// Relative due-date label — "Today", "Tomorrow", "Yesterday", weekday name,
// or absolute date for anything more than a week out.
export function fmtDue(d: Date | null | undefined): string | null {
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  const days = Math.round((dd.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days < 7) return dd.toLocaleDateString([], { weekday: 'long' });
  if (days < -1 && days > -7) return dd.toLocaleDateString([], { weekday: 'long' });
  return dd.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Two-letter initials from a name. "Alex" → "AL", "Alex Rivera" → "AR".
export function fmtInitials(name: string | undefined | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export function pctOf(num: number, denom: number): number {
  if (!denom) return 0;
  return Math.min(100, Math.round((num / denom) * 100));
}

export function fmtMoneyCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
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
