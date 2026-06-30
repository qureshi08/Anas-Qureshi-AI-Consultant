'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
    } else {
      router.push('/admin');
      router.refresh();
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(255,253,245,0.04) 27px, rgba(255,253,245,0.04) 28px)',
    }}>
      <form onSubmit={onSubmit} className="card" style={{ width: 360, maxWidth: '90vw', boxShadow: '6px 6px 0 var(--brick)' }}>
        <div className="tag">// OutboundOS</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--ink)', lineHeight: 1, margin: '4px 0 18px' }}>
          Admin login.
        </h1>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" />
        <div style={{ height: 12 }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 16 }}>
          {loading ? 'Signing in…' : 'Enter →'}
        </button>
        {err && <div style={{ color: 'var(--brick)', fontSize: 14, marginTop: 12 }}>{err}</div>}
      </form>
    </div>
  );
}
