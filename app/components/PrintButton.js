'use client';

import { useEffect } from 'react';

export default function PrintButton({ label = 'Print / Save as PDF', auto = false }) {
  // Opening the tailored resume should put the save dialog straight in front of Anas:
  // one click on the job card, then Save as PDF. The button stays for a second copy.
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => { try { window.print(); } catch { /* user can press the button */ } }, 600);
    return () => clearTimeout(t);
  }, [auto]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{ fontSize: 13, padding: '8px 16px', border: '2px solid #111', borderRadius: 8, background: '#111', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
    >
      {label}
    </button>
  );
}
