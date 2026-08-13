'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncRepliesButton({ label = 'Sync replies' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/outbound/sync-replies', { method: 'POST' });
      const data = await res.json();
      setMsg(data.message || (res.ok ? 'Done.' : 'Failed.'));
      if (data.repliedCount || data.bookedCount || data.bouncedCount) router.refresh();
    } catch (err) {
      setMsg(`Failed: ${err.message}`);
    }
    setBusy(false);
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button
        onClick={run}
        disabled={busy}
        className="mono"
        style={{
          background: 'transparent', border: '2px solid var(--ink)', borderRadius: 8,
          padding: '9px 16px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
          cursor: busy ? 'wait' : 'pointer', color: 'var(--ink)',
        }}
      >
        {busy ? 'Checking…' : label}
      </button>
      {msg && <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>{msg}</span>}
    </span>
  );
}
