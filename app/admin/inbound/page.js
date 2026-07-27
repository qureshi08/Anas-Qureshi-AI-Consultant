import { createAdminClient } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminInboundPage() {
  const admin = createAdminClient();
  const { data: inbound } = await admin.from('inbound_leads').select('*').order('created_at', { ascending: false }).limit(100);
  const list = inbound || [];

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 4 }}>Inbound</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>From the landing page &middot; {list.length}</p>

      {list.length === 0 && <p style={{ color: 'var(--ink3)' }}>No inbound yet. Form submissions from your site show up here.</p>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', textAlign: 'left', borderBottom: '2px solid var(--ink)' }}>
              <th style={{ padding: '10px 12px' }}>Email</th>
              <th style={{ padding: '10px 12px' }}>Task described</th>
              <th style={{ padding: '10px 12px' }}>Received</th>
            </tr>
          </thead>
          <tbody>
            {list.map(i => (
              <tr key={i.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--ink)' }}>{i.email}</td>
                <td style={{ padding: '10px 12px', color: 'var(--ink2)' }}>{i.task}</td>
                <td className="mono" style={{ padding: '10px 12px', fontSize: 11, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>
                  {new Date(i.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
