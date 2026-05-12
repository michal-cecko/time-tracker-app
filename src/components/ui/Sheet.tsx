import type { ReactNode } from 'react';

export function Sheet({
  title,
  children,
  onClose,
}: {
  title?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="sheet-grab" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
