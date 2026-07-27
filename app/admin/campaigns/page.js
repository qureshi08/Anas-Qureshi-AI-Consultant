import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import { createCampaign } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminCampaignsPage() {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('*').order('created_at', { ascending: false });
  const { data: leads } = await admin.from('leads').select('campaign_id, status, sent_at');
  const { data: accounts } = await admin.from('sending_accounts').select('id').eq('active', 1);

  const countsFor = (id) => {
    const ls = (leads || []).filter(l => l.campaign_id === id);
    return {
      total: ls.length,
      sent: ls.filter(l => l.sent_at).length,
      replied: ls.filter(l => l.status === 'replied' || l.status === 'booked').length,
    };
  };

  const noInbox = !accounts || accounts.length === 0;

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 4 }}>Cold email</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>
        Scraped lists &middot; sequences &middot; sent from your own inboxes
      </p>

      {noInbox && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--amber)', boxShadow: '4px 4px 0 var(--amber)' }}>
          <div className="tag" style={{ color: 'var(--amber)' }}>Set this up first</div>
          <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 6 }}>
            No sending inbox connected yet, so nothing can go out.{' '}
            <Link href="/admin/inboxes" style={{ color: 'var(--brick)', fontWeight: 'bold' }}>Add one under Inboxes &rarr;</Link>
          </p>
        </div>
      )}

      <section className="card" style={{ marginBottom: 24 }}>
        <div className="tag">New campaign</div>
        <form action={createCampaign} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-end' }}>
          <input name="name" placeholder="Name (e.g. UK roofers, March)" required style={{ flex: '1 1 200px' }} />
          <input name="goal" placeholder="Goal (e.g. book a call)" required style={{ flex: '1 1 180px' }} />
          <input name="icp" placeholder="Who they are" style={{ flex: '1 1 180px' }} />
          <button className="btn" type="submit">Create</button>
        </form>
      </section>

      {(!campaigns || campaigns.length === 0) && (
        <p style={{ color: 'var(--ink3)' }}>No campaigns yet. Create one above, then add the email and your leads.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(campaigns || []).map(c => {
          const k = countsFor(c.id);
          const ready = c.subject_template && c.body_template;
          return (
            <Link key={c.id} href={`/admin/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>{c.name}</div>
                    <div style={{ color: 'var(--ink3)', fontSize: 14 }}>{c.goal}{c.icp ? ` · ${c.icp}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--ink2)' }}>
                      {k.total} leads &middot; {k.sent} sent &middot; {k.replied} replied
                    </div>
                    <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 4, color: ready ? 'var(--forest)' : 'var(--amber)' }}>
                      {ready ? c.status : 'No email written yet'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
