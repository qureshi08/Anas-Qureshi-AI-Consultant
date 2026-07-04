'use client';

import { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey, I'm Anas's AI assistant, and yes, he built me. Tell me one repetitive task your team does by hand and I'll show you how he'd automate it. What are you working on?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.reply || "Sorry, I glitched. Email Anas at muhammadanasq@gmail.com." }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Something went wrong. Email Anas at muhammadanasq@gmail.com." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with Anas's AI assistant"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 200,
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
            background: 'var(--brick)', color: 'var(--paper)', border: '2.5px solid var(--ink)',
            borderRadius: 40, padding: '12px 22px', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer',
          }}
        >
          Ask my AI ✦
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 360, maxWidth: 'calc(100vw - 32px)',
          height: 520, maxHeight: 'calc(100vh - 48px)',
          background: 'var(--paper)', border: '2.5px solid var(--ink)', borderRadius: 14,
          boxShadow: '6px 6px 0 var(--ink)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--ink)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--paper)' }}>Anas&apos;s AI assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--paper)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%',
                background: m.role === 'user' ? 'var(--brick-light)' : 'var(--paper2)',
                border: '2px solid var(--ink)', borderRadius: 10, padding: '8px 11px',
                fontSize: 14, color: 'var(--ink2)', lineHeight: 1.4, whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--ink3)' }}>typing…</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '2px solid var(--ink)' }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your question…" style={{ flex: 1, fontSize: 14, padding: '9px 11px' }} />
            <button type="submit" disabled={loading} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, background: 'var(--brick)', color: 'var(--paper)', border: '2.5px solid var(--brick)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
