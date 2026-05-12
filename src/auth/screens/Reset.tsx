import { useMemo, useState } from 'react';
import { apiAuth } from '@/api/client';

function strength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; klass: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ['—', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  const klass = ['', 'weak', 'fair', 'good', 'strong'][s];
  return { score: s as 0 | 1 | 2 | 3 | 4, label: labels[s], klass };
}

export function Reset({ onDone, token }: { onDone: () => void; token: string }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const st = useMemo(() => strength(pw), [pw]);
  const matches = pw && pw === pw2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches) return setErr('Passwords do not match');
    setErr(null); setBusy(true);
    try { await apiAuth.reset(token, pw); onDone(); }
    catch (ex: any) { setErr(ex?.body?.error ?? ex?.message ?? 'Reset failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-logo">L</div>
      <div className="auth-title">Set a new password</div>
      <div className="auth-sub">At least 8 characters with a number.</div>
      <form className="auth-form" onSubmit={submit}>
        <div className="field"><label>New password</label><input type="password" value={pw} minLength={8} onChange={(e) => setPw(e.target.value)} required /></div>
        <div className={`strength ${st.klass}`}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={`seg ${i <= st.score ? 'on' : ''}`} />)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{st.label}</div>
        <div className="field"><label>Confirm</label><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
        {err && <div className="auth-error">{err}</div>}
        <button type="submit" className="btn primary lg" disabled={busy || !matches || st.score < 2}>{busy ? 'Saving…' : 'Save & log in'}</button>
      </form>
    </div>
  );
}
