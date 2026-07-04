'use client';

import { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [convId] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)
  );
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey, I'm Anas's AI assistant, and yes, he built me. Tell me one repetitive task your team does by hand and I'll show you how he'd automate it with AI. What are you working on?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
        body: JSON.stringify({ conversationId: convId, messages: next }),
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
    <div style={{
      background: 'var(--paper)', border: '2.5px solid var(--ink)', borderRadius: 14,
      boxShadow: '6px 6px 0 var(--brick)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', height: 520, maxHeight: '72vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', background: 'var(--ink)' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,0.25)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--paper)' }}>Anas&apos;s AI assistant</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: '.12em', color: 'rgba(255,253,245,0.5)', textTransform: 'uppercase' }}>live demo</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%',
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
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything, or tell me a task…" style={{ flex: 1, fontSize: 14, padding: '9px 11px' }} />
        <button type="submit" disabled={loading} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, background: 'var(--brick)', color: 'var(--paper)', border: '2.5px solid var(--brick)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Send</button>
      </form>
    </div>
  );
}
