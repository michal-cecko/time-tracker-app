import { Icon } from './Icon';

export interface BreadcrumbProject {
  id: string;
  name: string;
  colorHex?: string;
}

export interface BreadcrumbTask {
  id: string;
  title: string;
}

interface BreadcrumbsProps {
  project?: BreadcrumbProject | null;
  ancestors?: Array<BreadcrumbTask> | null;
  current?: BreadcrumbTask | null;
  onProject?: (id: string) => void;
  onTask?: (id: string) => void;
}

export function Breadcrumbs({ project, ancestors, current, onProject, onTask }: BreadcrumbsProps) {
  const crumbs: Array<{
    key: string;
    label: string;
    colorHex?: string;
    onClick?: (e: React.MouseEvent) => void;
    current?: boolean;
  }> = [];

  if (project) {
    crumbs.push({
      key: `p:${project.id}`,
      label: project.name,
      colorHex: project.colorHex,
      onClick: onProject
        ? (e) => { e.stopPropagation(); onProject(project.id); }
        : undefined,
    });
  }
  for (const a of ancestors ?? []) {
    crumbs.push({
      key: `t:${a.id}`,
      label: a.title,
      onClick: onTask
        ? (e) => { e.stopPropagation(); onTask(a.id); }
        : undefined,
    });
  }
  if (current) {
    crumbs.push({ key: `c:${current.id}`, label: current.title, current: true });
  }

  if (crumbs.length === 0) return null;

  return (
    <span className="bc">
      {crumbs.map((c, i) => (
        <span key={c.key} className="bc-seg-wrap" style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
          {i > 0 && <span className="bc-sep" aria-hidden><Icon.ChevronRight size={10} /></span>}
          {c.onClick ? (
            <button type="button" className={`bc-seg ${c.current ? 'current' : ''}`} onClick={c.onClick}>
              {c.colorHex && <span className="dot" style={{ background: c.colorHex }} />}
              <span>{c.label}</span>
            </button>
          ) : (
            <span className={`bc-seg ${c.current ? 'current' : ''}`} style={{ cursor: 'inherit' }}>
              {c.colorHex && <span className="dot" style={{ background: c.colorHex }} />}
              <span>{c.label}</span>
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
