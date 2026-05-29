import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { EditEntrySheet } from '@/components/ui/sheets/EditEntrySheet';
import { ConfirmSheet } from '@/components/ui/sheets/ConfirmSheet';
import { api } from '@/api/client';
import { entries as entriesApi } from '@/api/mutations';
import type { TimeEntry } from '@/api/types';
import { fmtHM, fmtClock } from '@/utils/format';

export function DesktopHistory({ onSelectTask }: { onSelectTask: (id: string) => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [entryEdit, setEntryEdit] = useState<TimeEntry | null>(null);
  const [entryDelete, setEntryDelete] = useState<TimeEntry | null>(null);

  const load = async () => setEntries(await api('/time-entries'));
  useEffect(() => { load(); }, []);

  return (
    <div className="dt-page">
      <div className="dt-page-head">
        <div>
          <div className="dt-page-title">History</div>
          <div className="dt-page-sub">All time entries</div>
        </div>
        <div className="dt-page-actions">
          <button className="dt-btn"><Icon.Filter size={12} /> Filter</button>
          <button className="dt-btn primary"><Icon.Plus size={12} /> Manual entry</button>
        </div>
      </div>
      <div className="dt-section dt-table">
        <div className="dt-table-head">
          <span style={{ width: 160 }}>When</span>
          <span style={{ flex: 1 }}>Task</span>
          <span style={{ width: 130 }}>Project</span>
          <span style={{ width: 80, textAlign: 'right' }}>Duration</span>
          <span style={{ width: 56 }} />
        </div>
        {entries.map((e) => {
          const proj = e.task?.project;
          const live = !e.endedAt;
          const dur = live
            ? Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000)
            : e.durationSeconds;
          return (
            <div
              key={e.id}
              className="dt-task"
              onClick={() => e.taskId && onSelectTask(e.taskId)}
            >
              <span className="dt-muted mono" style={{ width: 160, fontSize: 11 }}>
                {new Date(e.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                {' '}
                {fmtClock(new Date(e.startedAt))}
                {e.endedAt ? ` – ${fmtClock(new Date(e.endedAt))}` : ' · live'}
              </span>
              <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span className="dt-truncate">{e.task?.title ?? <span className="dt-muted">Unassigned</span>}</span>
                {e.manual && <span className="dt-tag">manual</span>}
                {e.note && <span className="dt-muted dt-truncate" style={{ fontSize: 11 }}>· {e.note}</span>}
              </span>
              <span style={{ width: 130, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                {proj && <span className="dt-swatch" style={{ background: proj.colorHex }} />}
                <span className="dt-muted dt-truncate">{proj?.name ?? '—'}</span>
              </span>
              <span className="mono" style={{ width: 80, textAlign: 'right', color: live ? 'var(--accent)' : undefined }}>
                {live && <span className="dt-live-dot" style={{ marginRight: 4 }} />}
                {fmtHM(dur)}
              </span>
              <span style={{ width: 56, display: 'flex', justifyContent: 'flex-end', gap: 2 }} onClick={(ev) => ev.stopPropagation()}>
                <button className="dt-ghost" onClick={() => setEntryEdit(e)} aria-label="Edit entry"><Icon.Edit size={11} /></button>
                <button className="dt-ghost" onClick={() => setEntryDelete(e)} aria-label="Delete entry" style={{ color: 'var(--st-return)' }}><Icon.Trash size={11} /></button>
              </span>
            </div>
          );
        })}
        {entries.length === 0 && <div style={{ padding: 20, color: 'var(--text-3)' }}>No entries.</div>}
      </div>

      {entryEdit && (
        <EditEntrySheet
          entry={entryEdit}
          onClose={() => { setEntryEdit(null); load(); }}
          onDeleteRequest={() => { setEntryDelete(entryEdit); setEntryEdit(null); }}
        />
      )}
      {entryDelete && (
        <ConfirmSheet
          title="Delete entry?"
          message="This time entry will be permanently removed."
          confirmLabel="Delete"
          onConfirm={async () => { await entriesApi.remove(entryDelete.id); load(); }}
          onClose={() => setEntryDelete(null)}
        />
      )}
    </div>
  );
}
