'use client';

import { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'anas_chat_v1';
const GREETING = { role: 'assistant', content: "Hey, I'm Anas's AI assistant. He built me, and I'm the kind of system he builds for businesses. What brings you here today?" };
const STARTERS = ['What do you build?', 'What does it cost?', 'I have a task to automate'];

function Linkified({ text }) {
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noreferrer" style={{ color: 'var(--brick)', fontWeight: 'bold', wordBreak: 'break-all' }}>
        {p.replace(/^https?:\/\//, '')}
      </a>
    ) : (
      p
    )
  );
}

function freshId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

export default function ChatWidget() {
  const [convId, setConvId] = useState(freshId);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef(null);

  // Restore a previous conversation after a refresh (standard persistence).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.convId && Array.isArray(saved.messages) && saved.messages.length > 1) {
        setConvId(saved.convId);
        setMessages(saved.messages);
      }
    } catch (e) { /* corrupted storage, start fresh */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ convId, messages: messages.slice(-50) })); } catch (e) {}
  }, [messages, convId, hydrated]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendText(text) {
    const clean = (text || '').trim().slice(0, 1000);
    if (!clean || loading) return;
    const next = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messages: next,
          visitorTimezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
        }),
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
        {messages.length > 1 && (
          <button
            onClick={() => {
              try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
              setConvId(freshId());
              setMessages([GREETING]);
              setInput('');
            }}
            className="mono"
            title="Start a new conversation"
            style={{
              marginLeft: 'auto', background: 'transparent', border: '1.5px solid rgba(255,253,245,0.35)',
              borderRadius: 6, color: 'rgba(255,253,245,0.75)', fontSize: 9, letterSpacing: '.1em',
              textTransform: 'uppercase', padding: '4px 9px', cursor: 'pointer',
            }}
          >
            ↺ New chat
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%',
            background: m.role === 'user' ? 'var(--brick-light)' : 'var(--paper2)',
            border: '2px solid var(--ink)', borderRadius: 10, padding: '8px 11px',
            fontSize: 14, color: 'var(--ink2)', lineHeight: 1.4, whiteSpace: 'pre-wrap',
          }}>
            <Linkified text={m.content} />
          </div>
        ))}
        {messages.length === 1 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
            {STARTERS.map((s) => (
              <button key={s} onClick={() => sendText(s)} style={{
                fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                background: 'var(--paper)', color: 'var(--brick)', border: '2px solid var(--brick)',
                borderRadius: 20, padding: '6px 13px',
              }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {loading && <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--ink3)' }}>typing…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendText(input); }} style={{ padding: '12px 12px 8px', borderTop: '2px solid var(--ink)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} maxLength={1000} placeholder="Ask anything, or tell me a task…" style={{ flex: 1, fontSize: 14, padding: '9px 11px' }} />
          <button type="submit" disabled={loading} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, background: 'var(--brick)', color: 'var(--paper)', border: '2.5px solid var(--brick)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Send</button>
        </div>
        <div className="mono" style={{ fontSize: 8.5, letterSpacing: '.06em', color: 'var(--ink3)', marginTop: 6, textTransform: 'uppercase' }}>
          Chats are saved so Anas can follow up · don&apos;t share card numbers or passwords
        </div>
      </form>
    </div>
  );
}
