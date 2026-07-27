import { createClient } from '../../lib/supabase/server';
import LogoutButton from '../components/LogoutButton';
import AdminNav from '../components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <div className="tag">AI Consultant · HQ</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--ink)', lineHeight: 1 }}>Your pipeline.</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>{user?.email}</div>
          <LogoutButton />
        </div>
      </div>

      <AdminNav />

      {children}
    </main>
  );
}
