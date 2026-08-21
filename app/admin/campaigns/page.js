import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import { createCampaign } from '../actions';
import { deleteCampaign } from '../outbound-actions';
import ColdEmailNav from '../../components/ColdEmailNav';
import { campaignEra, PIVOT } from '../../../lib/era';

export const dynamic = 'force-dynamic';

const GOALS = [
  ['Book a 15-min call', 'book_call'],
  ['Get a reply', 'get_reply'],
  ['Watch a video or visit a page', 'watch_video'],
  ['Direct purchase', 'buy'],
];

const PLATFORMS = [
  ['Cold email', 'email'],
  ['LinkedIn DM', 'linkedin'],
  ['Instagram DM', 'instagram'],
  ['SMS', 'sms'],
];

const GOAL_LABEL = Object.fromEntries(GOALS.map(([label, value]) => [value, label]));

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
      <ColdEmailNav />

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 4 }}>Campaigns</h2>
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
        <form action={createCampaign} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <input name="name" placeholder="Name, e.g. UK roofers, March" required style={{ flex: '2 1 220px' }} />
            <select name="goal" required style={{ flex: '1 1 190px' }}>
              {GOALS.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="platform" style={{ flex: '1 1 150px' }}>
              {PLATFORMS.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <textarea name="icp" placeholder="Who they are, e.g. roofing company owners in mid-size UK cities, no website, 2-10 staff" style={{ minHeight: 56, resize: 'vertical' }} />
          <button className="btn" type="submit" style={{ marginTop: 10 }}>Create campaign &rarr;</button>
        </form>
      </section>

      {(!campaigns || campaigns.length === 0) && (
        <p style={{ color: 'var(--ink3)' }}>No campaigns yet. Create one above, then add the email and your leads.</p>
      )}

      {(() => {
        const current = (campaigns || []).filter(c => campaignEra(c) === 'current');
        const archived = (campaigns || []).filter(c => campaignEra(c) === 'recruiting');
        return (
          <>
            {current.length === 0 && (campaigns || []).length > 0 && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'var(--amber)', boxShadow: '4px 4px 0 var(--amber)' }}>
                <div className="tag" style={{ color: 'var(--amber)' }}>No current-era campaign yet</div>
                <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 6 }}>
                  Every campaign below predates the {PIVOT} ICP switch (recruiting/staffing, retired). The marketing-agency
                  test needs its own campaign; create one above rather than reusing an archived one.
                </p>
              </div>
            )}
            {current.length > 0 && (
              <div className="tag" style={{ marginBottom: 10 }}>Current era &middot; marketing agencies</div>
            )}
            <CampaignList items={current} countsFor={countsFor} />
            {archived.length > 0 && (
              <details style={{ marginTop: 20 }}>
                <summary className="mono" style={{ cursor: 'pointer', fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Archive &middot; recruiting/staffing era &middot; {archived.length} campaigns (retired {PIVOT}, kept for history)
                </summary>
                <div style={{ marginTop: 12 }}>
                  <CampaignList items={archived} countsFor={countsFor} archived />
                </div>
              </details>
            )}
          </>
        );
      })()}
    </>
  );
}

function CampaignList({ items, countsFor, archived = false }) {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: archived ? 0.75 : 1 }}>
        {items.map(c => {
          const k = countsFor(c.id);
          const ready = c.subject_template && c.body_template;
          return (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <Link href={`/admin/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>{c.name}</div>
                  </Link>
                  <div style={{ color: 'var(--ink3)', fontSize: 14 }}>
                    {GOAL_LABEL[c.goal] || c.goal}{c.platform && c.platform !== 'email' ? ` · ${c.platform}` : ''}{c.icp ? ` · ${c.icp}` : ''}
                  </div>
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

              <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {[['Open', `/admin/campaigns/${c.id}`], ['Write', `/admin/compose?campaign=${c.id}`], ['Leads', `/admin/leads?campaign=${c.id}`], ['Send', `/admin/send?campaign=${c.id}`]].map(([label, href]) => (
                  <Link key={label} href={href} className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--brick)', textDecoration: 'none' }}>
                    {label}
                  </Link>
                ))}
                <details style={{ marginLeft: 'auto' }}>
                  <summary className="mono" style={{ cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink3)', listStyle: 'none' }}>
                    Delete
                  </summary>
                  <form action={deleteCampaign} style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="mono"
                      style={{
                        background: 'var(--brick)', color: 'var(--paper)', border: 'none', borderRadius: 6,
                        padding: '7px 12px', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em',
                      }}
                    >
                      Delete campaign and its {k.total} leads
                    </button>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
      </div>
  );
}
