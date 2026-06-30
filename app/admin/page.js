import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';
import { createCampaign, addLead } from './actions';
import LogoutButton from '../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('*').order('created_at', { ascending: false });
  const { data: leads } = await admin.from('leads').select('campaign_id, status, sent_at');
  const { data: inbound } = await admin.from('inbound_leads').select('*').order('created_at', { ascending: false }).limit(50);

  const countsFor = (id) => {
    const ls = (leads || []).filter(l => l.campaign_id === id);
    return {
      total: ls.length,
      sent: ls.filter(l => l.sent_at).length,
      replied: ls.filter(l => l.status === 'replied' || l.status === 'booked').length,
    };
  };

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 80px' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 16, marginBottom: 28 }}>
        <div>
          <div className="tag">GTM Engine</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--ink)', lineHeight: 1 }}>Your pipeline.</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>{user?.email}</div>
          <LogoutButton />
        </div>
      </div>

      {/* inbound */}
      <section className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="tag">Inbound · from your landing page</div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>{(inbound || []).length}</span>
        </div>
        {(!inbound || inbound.length === 0) && <p style={{ color: 'var(--ink3)', marginTop: 10 }}>No inbound yet. Form submissions from your site show up here.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {(inbound || []).map(i => (
            <div key={i.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)', paddingBottom: 8 }}>
              <div style={{ fontWeight: 'bold', color: 'var(--ink)' }}>{i.email}</div>
              <div style={{ fontSize: 14, color: 'var(--ink2)' }}>{i.task}</div>
            </div>
          ))}
        </div>
      </section>

      {/* create campaign */}
      <section className="card" style={{ marginBottom: 28 }}>
        <div className="tag">New campaign</div>
        <form action={createCampaign} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>NAME</label>
            <input name="name" placeholder="e.g. Outbound agencies" required />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>GOAL</label>
            <input name="goal" placeholder="e.g. book audits" required />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>ICP</label>
            <input name="icp" placeholder="who you're targeting" />
          </div>
          <button className="btn" type="submit">Create</button>
        </form>
      </section>

      {/* campaigns list */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ink)', marginBottom: 14 }}>Campaigns</h2>
      {(!campaigns || campaigns.length === 0) && <p style={{ color: 'var(--ink3)' }}>No campaigns yet. Create one above.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(campaigns || []).map(c => {
          const k = countsFor(c.id);
          return (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--ink)' }}>{c.name}</div>
                  <div style={{ color: 'var(--ink3)', fontSize: 14 }}>{c.goal}{c.icp ? ` · ${c.icp}` : ''}</div>
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--ink2)' }}>
                  {k.total} leads · {k.sent} sent · {k.replied} replied
                </div>
              </div>
              <form action={addLead} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
                <input type="hidden" name="campaign_id" value={c.id} />
                <input name="first_name" placeholder="First name" required style={{ flex: '1 1 120px' }} />
                <input name="email" placeholder="Email" type="email" required style={{ flex: '1 1 160px' }} />
                <input name="company" placeholder="Company" style={{ flex: '1 1 140px' }} />
                <button className="btn" type="submit" style={{ fontSize: 16, padding: '9px 18px' }}>+ Lead</button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}
