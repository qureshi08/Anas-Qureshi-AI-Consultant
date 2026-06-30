'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      className="mono"
      style={{
        background: 'transparent', border: '2px solid var(--ink)', borderRadius: 8,
        padding: '7px 14px', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
        cursor: 'pointer', color: 'var(--ink)',
      }}
    >
      Log out
    </button>
  );
}
