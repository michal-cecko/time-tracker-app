import { fmtMoneyCents } from '@/utils/format';
import type { Task } from '@/api/types';

export interface BranchEarnings {
  earned: number;
  notInvoiced: number;
  hasBilling: boolean;
}

/** Recursively walks a task tree and sums earnings at every level. */
export function branchEarnings(tasks: Task[]): BranchEarnings {
  let earned = 0, notInvoiced = 0, hasBilling = false;
  const walk = (ts: Task[]) => {
    for (const t of ts) {
      if (t.billingMode !== 'NONE') {
        hasBilling = true;
        const e = t.billingMode === 'HOURLY_RATE'
          ? Math.round((t.hourlyRateCents ?? 0) * t.totalTime / 3600)
          : (t.taskPriceCents ?? 0);
        earned += e;
        if (t.status === 'DONE') notInvoiced += e;
      }
      if (t.children?.length) walk(t.children);
    }
  };
  walk(tasks);
  return { earned, notInvoiced, hasBilling };
}

interface Metric { label: string; value: number | null; accent?: boolean }

export function BillingMetricBar({ metrics }: { metrics: Metric[] }) {
  const visible = metrics.filter((m) => m.value !== null);
  if (!visible.length) return null;
  return (
    <div style={{ display: 'flex', background: 'var(--bg-elev)', borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
      {visible.map((m, i) => (
        <div
          key={i}
          style={{ flex: 1, padding: '12px 16px', borderRight: i < visible.length - 1 ? '1px solid var(--line)' : undefined }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>
            {m.label}
          </div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: m.accent ? 'var(--st-return)' : 'var(--text)' }}>
            {fmtMoneyCents(m.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
