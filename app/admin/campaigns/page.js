import { createAdminClient } from '../../../lib/supabase/admin';
import { createCampaign, addLead } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminCampaignsPage() {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('*').order('created_at', { ascending: false });
  const { data: leads } = await admin.from('leads').select('campaign_id, status, sent_at');

  const countsFor = (id) => {
    const ls = (leads || []).filter(l => l.campaign_id === id);
    return { total: ls.length, sent: ls.filter(l => l.sent_at).length, replied: ls.filter(l => l.status === 'replied' || l.status === 'booked').length };
  };

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 4 }}>Email campaigns</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>Bulk, secondary lane</p>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="tag">New campaign</div>
        <form action={createCampaign} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-end' }}>
          <input name="name" placeholder="Name" required style={{ flex: '1 1 200px' }} />
          <input name="goal" placeholder="Goal" required style={{ flex: '1 1 200px' }} />
          <input name="icp" placeholder="ICP" style={{ flex: '1 1 200px' }} />
          <button className="btn" type="submit">Create</button>
        </form>
      </section>

      {(!campaigns || campaigns.length === 0) && <p style={{ color: 'var(--ink3)' }}>No campaigns yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(campaigns || []).map(c => {
          const k = countsFor(c.id);
          return (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>{c.name}</div>
                  <div style={{ color: 'var(--ink3)', fontSize: 14 }}>{c.goal}{c.icp ? ` · ${c.icp}` : ''}</div>
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--ink2)' }}>{k.total} leads &middot; {k.sent} sent &middot; {k.replied} replied</div>
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
    </>
  );
}
