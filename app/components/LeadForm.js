'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function LeadForm() {
  const [email, setEmail] = useState('');
  const [task, setTask] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? createClient() : null;

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!supabase) { setErr('Form not configured yet. Email me at muhammadanasq@gmail.com'); return; }
    const { error } = await supabase.from('inbound_leads').insert({ email, task });
    if (error) setErr('Something glitched. Email me directly at muhammadanasq@gmail.com');
    else setDone(true);
  }

  if (done) {
    return (
      <div className="card" style={{ borderColor: 'var(--brick)', boxShadow: '4px 4px 0 var(--brick)' }}>
        <div style={{ fontSize: 36 }}>✅</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--forest)' }}>Got it.</h3>
        <p>I&apos;ll take a real look and get back to you within a couple of days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ borderColor: 'var(--brick)', boxShadow: '4px 4px 0 var(--brick)' }}>
      <div className="tag">Show me the task</div>
      <div style={{ height: 12 }} />
      <input type="email" placeholder="Your best email" value={email} onChange={e => setEmail(e.target.value)} required />
      <div style={{ height: 12 }} />
      <textarea placeholder="What does your team do by hand, over and over? (the same questions answered, data copied between tools, the same docs drafted...)" value={task} onChange={e => setTask(e.target.value)} required style={{ minHeight: 110, resize: 'vertical' }} />
      <button className="btn" type="submit" style={{ width: '100%', marginTop: 14 }}>Send it to me →</button>
      {err && <p style={{ color: 'var(--brick)', fontSize: 13, marginTop: 10 }}>{err}</p>}
    </form>
  );
}
