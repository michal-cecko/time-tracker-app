import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import { StatusDot } from './Status';
import { PriorityFlag } from './PriorityFlag';
import type { Project, Task } from '@/api/types';
import { fmtHM } from '@/utils/format';

interface TaskRowProps {
  task: Task;
  project?: { name: string; initials: string; colorHex: string };
  showProject?: boolean;
  onOpen?: () => void;
  onStatusClick?: () => void;
  onPlay?: () => void;
}

export function TaskRow({ task, project, showProject, onOpen, onStatusClick, onPlay }: TaskRowProps) {
  const closed = task.status === 'DONE' || task.status === 'INVOICED';
  return (
    <div className={`task ${closed ? 'done' : ''}`}>
      <button onClick={(e) => { e.stopPropagation(); onStatusClick?.(); }} style={{ display: 'flex' }} aria-label="Change status">
        <StatusDot status={task.status} />
      </button>
      <div className="grow" onClick={onOpen} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
        <div className="title-line">
          <span>{task.title}</span>
          <PriorityFlag urgent={task.urgent} />
        </div>
        <div className="meta">
          {showProject && project && (
            <>
              <span className="hstack" style={{ gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: project.colorHex }} />
                {project.name}
              </span>
              <span className="sep" />
            </>
          )}
          <span className="mono">{fmtHM(task.totalTime)}{task.totalEstimate > 0 ? ` / ${fmtHM(task.totalEstimate)}` : ''}</span>
          {task.dueDate && <><span className="sep" /><span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></>}
        </div>
      </div>
      {onPlay && (
        <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="icon-btn" aria-label={task.running ? 'Pause' : 'Play'}>
          {task.running ? <Icon.Pause size={14} /> : <Icon.Play size={14} />}
        </button>
      )}
    </div>
  );
}

export function NestedTaskRow({
  task,
  depth = 0,
  onOpen,
  onStatusClick,
  expanded,
  onToggle,
}: {
  task: Task;
  depth?: number;
  onOpen?: (id: string) => void;
  onStatusClick?: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = task.children?.length > 0;
  const isOpen = expanded.has(task.id);
  const closed = task.status === 'DONE' || task.status === 'INVOICED';
  return (
    <>
      <div className={`task ${closed ? 'done' : ''}`} style={{ paddingLeft: 14 + depth * 18 }}>
        {hasChildren ? (
          <button onClick={() => onToggle(task.id)} className="hstack" style={{ width: 18 }} aria-label="Expand">
            {isOpen ? <Icon.ChevronDown size={14} /> : <Icon.ChevronRight size={14} />}
          </button>
        ) : (
          <span style={{ width: 18 }} />
        )}
        <button onClick={(e) => { e.stopPropagation(); onStatusClick?.(task.id); }} aria-label="Change status">
          <StatusDot status={task.status} />
        </button>
        <div className="grow" onClick={() => onOpen?.(task.id)} style={{ cursor: 'pointer' }}>
          <div className="title-line">
            <span>{task.title}</span>
            <PriorityFlag urgent={task.urgent} />
          </div>
          <div className="meta">
            <span className="mono">{fmtHM(task.totalTime)}{task.totalEstimate > 0 ? ` / ${fmtHM(task.totalEstimate)}` : ''}</span>
            {hasChildren && <><span className="sep" /><span>{task.children.length} sub</span></>}
          </div>
        </div>
        {task.running && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
      </div>
      {isOpen && hasChildren && task.children.map((c) => (
        <NestedTaskRow
          key={c.id}
          task={c}
          depth={depth + 1}
          onOpen={onOpen}
          onStatusClick={onStatusClick}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}
