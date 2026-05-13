interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Centered confirmation dialog (vs the bottom-anchored ActionSheet). Used
// for low-blast-radius destructive actions where a one-tap confirm is enough
// (delete task, delete entry). For project deletion we still require typing
// the project name — see DeleteProjectModal.
export function ConfirmSheet({
  title, message, confirmLabel = 'Delete', danger = true, onConfirm, onClose,
}: Props) {
  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 18,
          width: 'calc(100% - 48px)', maxWidth: 360, padding: 20,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
        {message && (
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.55 }}>
            {message}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn lg" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn lg"
            style={{
              flex: 1,
              background: danger ? 'var(--st-return)' : 'var(--accent)',
              color: '#fff', borderColor: 'transparent', fontWeight: 600,
            }}
            onClick={() => { onClose(); onConfirm(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
