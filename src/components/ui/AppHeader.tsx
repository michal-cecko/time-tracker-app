import type { ReactNode } from 'react';

export function AppHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="app-header">
      <div>
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right && <div className="hstack">{right}</div>}
    </div>
  );
}
