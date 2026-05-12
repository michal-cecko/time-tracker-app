import { Sheet } from '@/components/ui/Sheet';
import { useTweaks, type Density, type Theme } from '@/state/tweaks';
import { api } from '@/api/client';

const ACCENTS = ['#FF7A45', '#4A7EFF', '#34C270', '#A464D9', '#E5B341', '#E54336'];

export function TweaksPanel({ onClose }: { onClose: () => void }) {
  const t = useTweaks();

  const change = async (patch: Partial<typeof t>) => {
    t.set(patch);
    // mirror to server settings
    const payload: any = {};
    if (patch.theme) payload.theme = patch.theme;
    if (patch.accentHex) payload.accentHex = patch.accentHex;
    if (patch.density) payload.density = patch.density;
    if (patch.fontScale != null) payload.fontScale = patch.fontScale;
    if (Object.keys(payload).length) {
      try { await api('/me/settings', { method: 'PATCH', body: payload }); } catch {}
    }
  };

  return (
    <Sheet title="Tweaks" onClose={onClose}>
      <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Row label="Theme">
          <div className="hstack" style={{ gap: 6 }}>
            {(['dark', 'bright'] as Theme[]).map((v) => (
              <button key={v} className="seg-btn" style={{ height: 32, flex: 1, background: v === t.theme ? 'var(--accent-tint)' : 'var(--bg-elev-2)', color: v === t.theme ? 'var(--accent)' : 'var(--text-2)' }} onClick={() => change({ theme: v })}>
                {v === 'dark' ? 'Dark' : 'Bright'}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Accent">
          <div className="hstack" style={{ gap: 8 }}>
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => change({ accentHex: c })}
                style={{
                  width: 28, height: 28, borderRadius: 8, background: c,
                  border: c.toLowerCase() === t.accentHex.toLowerCase() ? '2px solid var(--text)' : '2px solid transparent',
                }}
                aria-label={`Accent ${c}`}
              />
            ))}
          </div>
        </Row>

        <Row label="Density">
          <div className="hstack" style={{ gap: 6 }}>
            {(['compact', 'regular', 'comfy'] as Density[]).map((d) => (
              <button key={d} className="seg-btn" style={{ height: 32, flex: 1, background: d === t.density ? 'var(--accent-tint)' : 'var(--bg-elev-2)', color: d === t.density ? 'var(--accent)' : 'var(--text-2)' }} onClick={() => change({ density: d })}>
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </Row>

        <Row label={`Font scale · ${(t.fontScale * 100).toFixed(0)}%`}>
          <input type="range" min={0.85} max={1.3} step={0.05} value={t.fontScale} onChange={(e) => change({ fontScale: Number(e.target.value) })} style={{ width: '100%' }} />
        </Row>

        <Row label="Show offline indicator">
          <Toggle on={t.showOffline} onChange={(v) => change({ showOffline: v })} />
        </Row>
      </div>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 26, borderRadius: 999,
      background: on ? 'var(--accent)' : 'var(--bg-elev-2)',
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s',
      }} />
    </button>
  );
}
