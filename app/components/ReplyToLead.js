'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Reply by hand to someone who wrote back, without leaving the log. */
export default function ReplyToLead({ leadId, email }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function send() {
    if (!body.trim()) return;
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/outbound/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, body }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Sent.');
        setBody('');
        setTimeout(() => { setOpen(false); setMsg(''); router.refresh(); }, 900);
      } else {
        setMsg(data.error || 'Failed.');
      }
    } catch (err) {
      setMsg(err.message);
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mono"
        style={{
          background: 'none', border: 'none', color: 'var(--brick)', cursor: 'pointer',
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', padding: 0,
        }}
      >
        Reply
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: 10, border: '2px solid var(--ink)', borderRadius: 8, background: 'var(--paper2)', minWidth: 260 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 6 }}>Replying to {email}</div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Thanks for getting back to me…"
        style={{ minHeight: 90, resize: 'vertical', fontSize: 13 }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={send} disabled={busy} style={{ fontSize: 13, padding: '7px 14px' }}>
          {busy ? 'Sending…' : 'Send reply'}
        </button>
        <button
          onClick={() => { setOpen(false); setMsg(''); }}
          className="mono"
          style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase' }}
        >
          Cancel
        </button>
        {msg && <span className="mono" style={{ fontSize: 11, color: msg === 'Sent.' ? 'var(--forest)' : 'var(--brick)' }}>{msg}</span>}
      </div>
    </div>
  );
}
