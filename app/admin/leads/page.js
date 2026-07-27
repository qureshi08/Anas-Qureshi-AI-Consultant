import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import { importCampaignLeads, deleteCampaignLead, resetCampaignLead, deleteAllCampaignLeads, addSingleLead } from '../outbound-actions';
import ColdEmailNav from '../../components/ColdEmailNav';

export const dynamic = 'force-dynamic';

const VSTYLE = {
  SAFE: { color: 'var(--forest)', label: 'Safe to send' },
  RISKY: { color: 'var(--amber)', label: 'Unverified' },
  ACCEPT_ALL: { color: 'var(--amber)', label: 'Catch-all' },
  INVALID: { color: 'var(--brick)', label: 'Do not send' },
  unknown: { color: 'var(--ink3)', label: 'Not checked' },
};

const FILTERS = [
  ['all', 'All'],
  ['SAFE', 'Safe'],
  ['RISKY', 'Unverified'],
  ['ACCEPT_ALL', 'Catch-all'],
  ['INVALID', 'Do not send'],
  ['unknown', 'Not checked'],
];

export default async function LeadsPage({ searchParams }) {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('id, name').order('created_at', { ascending: false });
  const list = campaigns || [];
  const campaignId = searchParams?.campaign || (list[0] ? String(list[0].id) : '');
  const filter = searchParams?.status || 'all';

  let leads = [];
  if (campaignId) {
    const { data } = await admin.from('leads').select('*').eq('campaign_id', campaignId).order('id');
    leads = data || [];
  }

  const bucket = v => (!v || v === 'unknown' ? 'unknown' : v);
  const counts = FILTERS.reduce((acc, [key]) => {
    acc[key] = key === 'all' ? leads.length : leads.filter(l => bucket(l.validation_status) === key).length;
    return acc;
  }, {});
  const rows = filter === 'all' ? leads : leads.filter(l => bucket(l.validation_status) === filter);

  return (
    <>
      <ColdEmailNav />

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>Leads</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>
        Scraped lists for cold email &middot; not your hand-sourced DM prospects
      </p>

      {list.length === 0 && (
        <p style={{ color: 'var(--ink3)' }}>
          No campaigns yet. <Link href="/admin/campaigns" style={{ color: 'var(--brick)' }}>Create one first &rarr;</Link>
        </p>
      )}

      {list.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {list.map(c => (
              <Link
                key={c.id}
                href={`/admin/leads?campaign=${c.id}`}
                className="mono"
                style={{
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
                  padding: '7px 14px', border: '2px solid var(--ink)', borderRadius: 6,
                  color: String(c.id) === String(campaignId) ? 'var(--paper)' : 'var(--ink)',
                  background: String(c.id) === String(campaignId) ? 'var(--ink)' : 'transparent',
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>

          {/* Validation buckets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {FILTERS.map(([key, label]) => (
              <Link
                key={key}
                href={`/admin/leads?campaign=${campaignId}&status=${key}`}
                className="mono"
                style={{
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
                  padding: '5px 11px', borderRadius: 6,
                  border: `1.5px solid ${filter === key ? 'var(--ink)' : 'rgba(26,18,5,0.2)'}`,
                  color: filter === key ? 'var(--ink)' : 'var(--ink3)',
                  background: filter === key ? 'var(--paper2)' : 'transparent',
                }}
              >
                {label} &middot; {counts[key]}
              </Link>
            ))}
          </div>

          {/* Add / import */}
          <details className="card" style={{ marginBottom: 16 }}>
            <summary className="mono" style={{ cursor: 'pointer', fontSize: 12, color: 'var(--brick)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Add leads
            </summary>

            <div style={{ marginTop: 14 }}>
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                Paste a list
              </p>
              <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 8 }}>
                One per line: <span className="mono" style={{ fontSize: 12 }}>Name, email@company.com, Company</span>
              </p>
              <form action={importCampaignLeads}>
                <input type="hidden" name="campaign_id" value={campaignId} />
                <textarea name="list" required placeholder={'Dave, dave@acmeroofing.com, Acme Roofing\nSarah, sarah@brighthvac.co.uk, Bright HVAC'} style={{ minHeight: 100, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                <button className="btn" type="submit" style={{ marginTop: 10 }}>Import &rarr;</button>
              </form>
            </div>

            <div style={{ marginTop: 18, borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 14 }}>
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Or add one
              </p>
              <form action={addSingleLead} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <input type="hidden" name="campaign_id" value={campaignId} />
                <input name="first_name" placeholder="First name" required style={{ flex: '1 1 120px' }} />
                <input name="email" type="email" placeholder="Email" required style={{ flex: '1 1 180px' }} />
                <input name="company" placeholder="Company" style={{ flex: '1 1 140px' }} />
                <input name="title" placeholder="Title" style={{ flex: '1 1 120px' }} />
                <button className="btn" type="submit" style={{ fontSize: 15, padding: '9px 18px' }}>+ Add</button>
              </form>
            </div>
          </details>

          {leads.length === 0 && <p style={{ color: 'var(--ink3)' }}>No leads in this campaign yet.</p>}

          {leads.length > 0 && (
            <>
              <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', textAlign: 'left', borderBottom: '2px solid var(--ink)' }}>
                      <th style={{ padding: '10px 12px' }}>Name</th>
                      <th style={{ padding: '10px 12px' }}>Email</th>
                      <th style={{ padding: '10px 12px' }}>Company</th>
                      <th style={{ padding: '10px 12px' }}>Deliverable?</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(l => {
                      const v = VSTYLE[bucket(l.validation_status)] || VSTYLE.unknown;
                      return (
                        <tr key={l.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)' }}>
                          <td style={{ padding: '9px 12px' }}>{l.first_name} {l.last_name || ''}</td>
                          <td style={{ padding: '9px 12px' }} className="mono">{l.email}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--ink3)' }}>{l.company || '—'}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: v.color }} title={l.validation_reason || ''}>
                              {v.label}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: l.status === 'replied' || l.status === 'booked' ? 'var(--forest)' : 'var(--ink3)' }}>
                              {l.status}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                            {l.status !== 'pending' && (
                              <form action={resetCampaignLead} style={{ display: 'inline' }}>
                                <input type="hidden" name="id" value={l.id} />
                                <input type="hidden" name="campaign_id" value={campaignId} />
                                <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase' }}>Reset</button>
                              </form>
                            )}
                            <form action={deleteCampaignLead} style={{ display: 'inline' }}>
                              <input type="hidden" name="id" value={l.id} />
                              <input type="hidden" name="campaign_id" value={campaignId} />
                              <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--brick)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', marginLeft: 8 }}>Delete</button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <details>
                <summary className="mono" style={{ cursor: 'pointer', fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Danger zone
                </summary>
                <form action={deleteAllCampaignLeads} style={{ marginTop: 10 }}>
                  <input type="hidden" name="campaign_id" value={campaignId} />
                  <button
                    type="submit"
                    className="mono"
                    style={{
                      background: 'var(--brick)', color: 'var(--paper)', border: 'none',
                      borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
                      fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em',
                    }}
                  >
                    Delete all {leads.length} leads in this campaign
                  </button>
                </form>
              </details>
            </>
          )}
        </>
      )}
    </>
  );
}
