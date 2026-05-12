import { useState } from 'react';
import { apiAuth } from '@/api/client';

export function Forgot({ onNav, onSent }: { onNav: (k: 'login') => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await apiAuth.forgot(email);
      onSent(email);
    } catch (ex: any) {
      setErr(ex?.message ?? 'Could not send reset link');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-logo">L</div>
      <div className="auth-title">Reset password</div>
      <div className="auth-sub">We'll email you a reset link.</div>
      <form className="auth-form" onSubmit={submit}>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        {err && <div className="auth-error">{err}</div>}
        <button type="submit" className="btn primary lg" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
          <button type="button" className="auth-link" onClick={() => onNav('login')}>Back to log in</button>
        </div>
      </form>
    </div>
  );
}
