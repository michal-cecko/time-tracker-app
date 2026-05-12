// Per chat msg #189: red flag only — no multiple priority tiers.
export function PriorityFlag({ urgent }: { urgent: boolean }) {
  if (!urgent) return null;
  return <span className="flag" style={{ ['--c' as any]: 'var(--pri-urgent)' }} aria-label="Urgent" />;
}
