'use client';

import { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'anas_chat_v1';
const GREETING = { role: 'assistant', content: "Hey, I'm Anas's AI assistant. He built me, and I'm the kind of system he builds for businesses. Ask me about any project on this page, or tell me a task you're sick of doing by hand." };
const STARTERS = ['Tell me about one of your projects', 'What does it cost?', 'I have a task to automate'];

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
  const scrollBoxRef = useRef(null);
  const inputRef = useRef(null);

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

  // Scroll only the chat box, never the page (scrollIntoView was dragging the page scrollbar).
  useEffect(() => {
    const el = scrollBoxRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function sendText(text) {
    const clean = (text || '').trim().slice(0, 1000);
    if (!clean || loading) return;
    const next = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
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
    // Tech reel style: a dark window card with the three dot title bar, like the terminals in the reels.
    <div className="window" style={{ display: 'flex', flexDirection: 'column', height: 520, maxHeight: '72vh' }}>
      <div className="window-bar" style={{ gap: 6, padding: '11px 14px' }}>
        <i /><i /><i />
        <span className="mono" style={{ fontSize: 12, color: 'rgba(255,254,250,.7)', marginLeft: 10 }}>anas · ai assistant</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--forest2)', marginLeft: 8 }}>● live</span>
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
              marginLeft: 'auto', background: 'rgba(255,254,250,.08)', border: 'none',
              borderRadius: 999, color: 'rgba(255,254,250,0.75)', fontSize: 11,
              padding: '4px 10px', cursor: 'pointer',
            }}
          >
            ↺ New chat
          </button>
        )}
      </div>

      <div ref={scrollBoxRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%',
            background: m.role === 'user' ? 'var(--brick)' : 'rgba(255,254,250,.07)',
            borderRadius: 12, padding: '9px 12px',
            fontSize: 14, color: '#FFFEFA', lineHeight: 1.45, whiteSpace: 'pre-wrap',
          }}>
            <Linkified text={m.content} />
          </div>
        ))}
        {messages.length === 1 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
            {STARTERS.map((s) => (
              <button key={s} onClick={() => sendText(s)} style={{
                fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                background: 'transparent', color: 'var(--brick-mid)', border: '1px solid var(--brick-mid)',
                borderRadius: 999, padding: '6px 13px',
              }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {loading && <div className="mono" style={{ alignSelf: 'flex-start', fontSize: 12, color: 'rgba(255,254,250,.55)' }}>typing…</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendText(input); }} style={{ padding: '12px 12px 8px', borderTop: '1px solid rgba(255,254,250,.1)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            maxLength={1000}
            placeholder="Ask anything, or tell me a task…"
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
            }}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const el = e.target;
              if (e.ctrlKey || e.shiftKey) {
                const start = el.selectionStart, end = el.selectionEnd;
                setInput(el.value.slice(0, start) + '\n' + el.value.slice(end));
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + 1;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
                });
              } else {
                sendText(el.value);
              }
            }}
            style={{ flex: 1, fontSize: 14, padding: '9px 12px', resize: 'none', lineHeight: 1.4, maxHeight: 110, overflowY: 'auto', background: 'rgba(255,254,250,.06)', color: '#FFFEFA', border: '1px solid rgba(255,254,250,.14)' }}
          />
          <button type="submit" disabled={loading} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, background: 'var(--brick)', color: '#FFFEFA', border: 'none', borderRadius: 999, padding: '8px 18px', cursor: 'pointer' }}>Send</button>
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'rgba(255,254,250,.45)', marginTop: 7 }}>
          Enter sends · Ctrl+Enter new line · chats are saved so Anas can follow up · no card numbers or passwords
        </div>
      </form>
    </div>
  );
}
