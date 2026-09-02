'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="mono"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text || ''); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked, user selects manually */ }
      }}
      style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer',
        padding: '5px 10px', border: '1.5px solid var(--ink)', borderRadius: 5,
        background: done ? 'var(--forest)' : 'var(--paper)', color: done ? 'var(--paper)' : 'var(--ink)',
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}
