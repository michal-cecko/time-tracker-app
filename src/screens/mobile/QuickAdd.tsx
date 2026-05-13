import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { api } from '@/api/client';
import { entries as entriesApi } from '@/api/mutations';
import type { Project, Status } from '@/api/types';
import { STATUS_META, STATUS_ORDER } from '@/api/types';

interface QuickAddProps {
  onClose: () => void;
  defaultProjectId?: string;
  /** When set, the created task is a subtask of this parent. The project
   *  field is hidden and inherited from the parent on the server. */
  parentTaskId?: string;
  parentTaskTitle?: string;
}

export function QuickAddSheet({ onClose, defaultProjectId, parentTaskId, parentTaskTitle }: QuickAddProps) {
  const isSubtask = !!parentTaskId;
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? '');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('BACKLOG');
  const [urgent, setUrgent] = useState(false);
  const [estimateMin, setEstimateMin] = useState('');
  const [startOnCreate, setStartOnCreate] = useState(false);

  useEffect(() => {
    if (isSubtask) return; // project is inherited from parent
    (async () => {
      const ps = await api<Project[]>('/projects?archived=false');
      setProjects(ps);
      if (!projectId && ps.length) setProjectId(ps[0].id);
    })();
  }, []);

  const submit = async () => {
    if (!title.trim()) return;
    if (!isSubtask && !projectId) return;
    const body: any = {
      title: title.trim(),
      status,
      urgent,
    };
    if (isSubtask) {
      body.parentTaskId = parentTaskId;
      // Backend still requires projectId on create. We pass the parent's
      // project — the caller provides it via defaultProjectId.
      if (defaultProjectId) body.projectId = defaultProjectId;
    } else {
      body.projectId = projectId;
    }
    if (estimateMin) body.estimateSeconds = Math.round(Number(estimateMin) * 60);
    const t = await api<{ id: string }>('/tasks', { method: 'POST', body });
    if (startOnCreate) await entriesApi.startTimer(t.id);
    onClose();
  };

  return (
    <Sheet title={isSubtask ? 'New subtask' : 'New task'} onClose={onClose}>
      <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isSubtask && parentTaskTitle && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '0 4px' }}>
            Under <span style={{ color: 'var(--text-2)' }}>{parentTaskTitle}</span>
          </div>
        )}
        <input
          autoFocus
          placeholder={isSubtask ? 'Subtask title' : 'What are you working on?'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ background: 'var(--bg-elev-2)', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontWeight: 500 }}
        />

        {!isSubtask && (
          <div className="card" style={{ padding: 10 }}>
            <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Project</span>
            </div>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elev-2)', color: 'var(--text)' }}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="card" style={{ padding: 10 }}>
          <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Status</span>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elev-2)', color: 'var(--text)' }}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
        <div className="card" style={{ padding: 10 }}>
          <label className={`checkbox ${urgent ? 'on' : ''}`} style={{ padding: '4px' }}>
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            <span className="box">{urgent && '✓'}</span>
            Urgent (red flag)
          </label>
        </div>
        <div className="card" style={{ padding: 10 }}>
          <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Estimate (minutes)</span>
          </div>
          <input type="number" min={0} placeholder="60" value={estimateMin} onChange={(e) => setEstimateMin(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elev-2)', color: 'var(--text)' }} />
        </div>
        <label className={`checkbox ${startOnCreate ? 'on' : ''}`} style={{ padding: '4px 0' }}>
          <input type="checkbox" checked={startOnCreate} onChange={(e) => setStartOnCreate(e.target.checked)} />
          <span className="box">{startOnCreate && '✓'}</span>
          Start timer on create
        </label>
        <div className="hstack" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!title.trim()} style={{ flex: 1 }}>Create</button>
        </div>
      </div>
    </Sheet>
  );
}
