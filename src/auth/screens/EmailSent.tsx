import { Icon } from '@/components/ui/Icon';

export function EmailSent({ email, onReset, onNav }: { email: string; onReset: () => void; onNav: (k: 'forgot' | 'login') => void }) {
  return (
    <div className="auth-shell">
      <div style={{
        width: 64, height: 64, borderRadius: 16, background: 'var(--accent-tint)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
      }}>
        <Icon.Check size={28} />
      </div>
      <div className="auth-title">Check your inbox</div>
      <div className="auth-sub mono" style={{ marginBottom: 4 }}>{email}</div>
      <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24, maxWidth: 320, textAlign: 'center' }}>
        We sent a link to reset your password. It expires in 1 hour.
      </div>
      <div className="auth-form" style={{ alignItems: 'center' }}>
        <button className="btn primary lg" onClick={onReset}>Open reset link (demo)</button>
        <button className="auth-link" onClick={() => onNav('forgot')}>Use different email</button>
        <button className="auth-link" onClick={() => onNav('login')}>Back to log in</button>
      </div>
    </div>
  );
}
