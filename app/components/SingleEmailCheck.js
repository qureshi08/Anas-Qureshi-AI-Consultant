'use client';

import { useState } from 'react';

const COLOR = {
  SAFE: 'var(--forest)',
  RISKY: 'var(--amber)',
  ACCEPT_ALL: 'var(--amber)',
  INVALID: 'var(--brick)',
  UNKNOWN: 'var(--ink3)',
};

export default function SingleEmailCheck() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function check(e) {
    e.preventDefault();
    if (!email) return;
    setBusy(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/outbound/validate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Check failed.');
      else setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="tag">Check one address</div>
      <form onSubmit={check} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="someone@company.com" style={{ flex: '1 1 200px' }}
        />
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Check'}</button>
      </form>

      {error && <p className="mono" style={{ fontSize: 12, color: 'var(--brick)', marginTop: 10 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 14, borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: COLOR[result.status] || 'var(--ink3)' }}>
              {result.status}
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>score {result.score}/100</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 6 }}>{result.reason}</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
            {[['Syntax', result.syntax], ['Mail server', result.mx], ['Disposable', !result.disposable], ['Personal address', !result.role]].map(([label, ok]) => (
              <span key={label} className="mono" style={{ fontSize: 10, color: ok ? 'var(--forest)' : 'var(--brick)' }}>
                {ok ? '✓' : '✗'} {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
