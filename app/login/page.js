'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

function LoginForm() {
  const params = useSearchParams();
  const denied = params.get('denied');
  const oauthError = params.get('error');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function signInWithGoogle() {
    setErr('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErr(error.message);
      setLoading(false);
    }
    // On success the browser leaves for Google, so no need to unset loading.
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(255,253,245,0.04) 27px, rgba(255,253,245,0.04) 28px)',
    }}>
      <div className="card" style={{ width: 380, maxWidth: '90vw', boxShadow: '6px 6px 0 var(--brick)' }}>
        <div className="tag">// AI Consultant · HQ</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--ink)', lineHeight: 1, margin: '4px 0 6px' }}>
          Admin login.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 20 }}>
          One click, no password to remember.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'var(--paper)', color: 'var(--ink)',
            border: '2.5px solid var(--ink)', borderRadius: 8,
            boxShadow: '4px 4px 0 var(--ink)', padding: '13px 20px',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
            <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
            <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.6z" />
            <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9.1 12.2-9.1z" />
          </svg>
          {loading ? 'Redirecting…' : 'Sign in with Google'}
        </button>

        {denied && (
          <div style={{ color: 'var(--brick)', fontSize: 14, marginTop: 14, lineHeight: 1.5 }}>
            That Google account is not on the allowlist. Sign in with the account that owns this admin,
            or add the address to <span className="mono" style={{ fontSize: 12 }}>ADMIN_EMAILS</span> in Vercel.
          </div>
        )}
        {oauthError && (
          <div style={{ color: 'var(--brick)', fontSize: 14, marginTop: 14 }}>{decodeURIComponent(oauthError)}</div>
        )}
        {err && <div style={{ color: 'var(--brick)', fontSize: 14, marginTop: 14 }}>{err}</div>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
