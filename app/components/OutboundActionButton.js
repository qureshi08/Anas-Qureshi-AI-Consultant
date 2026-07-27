'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Small POST-and-report button, used for follow-up processing and inbox tests.
 * Keeps the result visible next to the button instead of a toast that vanishes.
 */
export default function OutboundActionButton({ endpoint, payload, label, busyLabel = 'Working…', variant = 'secondary' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(null);

  async function run() {
    setBusy(true); setMsg(''); setOk(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      const data = await res.json();
      setOk(res.ok && data.success !== false);
      setMsg(data.message || data.error || (res.ok ? 'Done.' : 'Failed.'));
      if (res.ok && data.sent) router.refresh();
    } catch (err) {
      setOk(false);
      setMsg(err.message);
    }
    setBusy(false);
  }

  const base = {
    borderRadius: 8, padding: '9px 16px', fontSize: 11,
    letterSpacing: '.08em', textTransform: 'uppercase',
    cursor: busy ? 'wait' : 'pointer',
  };
  const style = variant === 'primary'
    ? { ...base, background: 'var(--brick)', color: 'var(--paper)', border: '2px solid var(--brick)' }
    : { ...base, background: 'transparent', color: 'var(--ink)', border: '2px solid var(--ink)' };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button onClick={run} disabled={busy} className="mono" style={style}>
        {busy ? busyLabel : label}
      </button>
      {msg && (
        <span className="mono" style={{ fontSize: 11, color: ok ? 'var(--forest)' : 'var(--brick)' }}>{msg}</span>
      )}
    </span>
  );
}
