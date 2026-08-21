import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import {
  importCampaignLeads, importCsvLeads, addSingleLead, deleteCampaignLead,
  deleteAllCampaignLeads, updateLeadStatus, validateOneLead,
} from '../outbound-actions';
import ColdEmailNav from '../../components/ColdEmailNav';
import { campaignEra, PIVOT } from '../../../lib/era';

export const dynamic = 'force-dynamic';

const VSTYLE = {
  SAFE: { color: 'var(--forest)', label: 'Safe' },
  RISKY: { color: 'var(--amber)', label: 'Unverified' },
  ACCEPT_ALL: { color: 'var(--amber)', label: 'Catch-all' },
  INVALID: { color: 'var(--brick)', label: 'Do not send' },
  unknown: { color: 'var(--ink3)', label: 'Not checked' },
};

const FILTERS = [
  ['all', 'All'], ['SAFE', 'Safe'], ['RISKY', 'Unverified'],
  ['ACCEPT_ALL', 'Catch-all'], ['INVALID', 'Do not send'], ['unknown', 'Not checked'],
];

const LEAD_STATUSES = ['pending', 'sent', 'replied', 'booked', 'skipped', 'failed'];

export default async function LeadsPage({ searchParams }) {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('id, name, created_at').order('created_at', { ascending: false });
  const list = campaigns || [];
  const currentList = list.filter(c => campaignEra(c) === 'current');
  const archivedList = list.filter(c => campaignEra(c) === 'recruiting');
  const campaignId = searchParams?.campaign || (currentList[0] ? String(currentList[0].id) : (list[0] ? String(list[0].id) : ''));
  const activeCampaign = list.find(c => String(c.id) === String(campaignId));
  const campaignArchived = activeCampaign ? campaignEra(activeCampaign) === 'recruiting' : false;
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

  const total = leads.length;
  const pct = n => (total ? Math.round((n / total) * 100) : 0);
  const safe = counts.SAFE || 0;
  const risky = (counts.RISKY || 0) + (counts.ACCEPT_ALL || 0);
  const invalid = counts.INVALID || 0;

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: archivedList.length ? 8 : 16 }}>
            {currentList.map(c => (
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
          {archivedList.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
                Archive (recruiting era):
              </span>
              {archivedList.map(c => (
                <Link
                  key={c.id}
                  href={`/admin/leads?campaign=${c.id}`}
                  className="mono"
                  style={{
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
                    padding: '5px 11px', border: '1.5px dashed rgba(26,18,5,0.35)', borderRadius: 6,
                    color: String(c.id) === String(campaignId) ? 'var(--paper)' : 'var(--ink3)',
                    background: String(c.id) === String(campaignId) ? 'var(--ink3)' : 'transparent',
                  }}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {campaignArchived && (
            <div className="card" style={{ marginBottom: 16, borderColor: 'var(--brick)', boxShadow: '4px 4px 0 var(--brick)' }}>
              <div className="tag" style={{ color: 'var(--brick)' }}>Retired-era campaign</div>
              <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 6 }}>
                These leads target the recruiting/staffing ICP, retired {PIVOT} (goal.md). Kept for history, not for
                loading or sending in the current test.
              </p>
            </div>
          )}

          {/* Stats bar */}
          {total > 0 && (
            <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              {[
                ['Total leads', total, 'var(--ink)', null],
                ['Safe to send', safe, 'var(--forest)', pct(safe)],
                ['Unverified', risky, 'var(--amber)', pct(risky)],
                ['Do not send', invalid, 'var(--brick)', pct(invalid)],
              ].map(([label, value, color, percent]) => (
                <div key={label} className="card" style={{ flex: '1 1 130px', padding: '14px 16px', textAlign: 'center', borderColor: color, boxShadow: `4px 4px 0 ${color}` }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color, lineHeight: 1 }}>{value}</div>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>
                    {label}{percent !== null ? ` · ${percent}%` : ''}
                  </div>
                </div>
              ))}
            </section>
          )}

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

            {/* CSV upload */}
            <div style={{ marginTop: 14 }}>
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                Import a CSV
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 8 }}>
                Header row required. Recognised columns:{' '}
                <span className="mono" style={{ fontSize: 12 }}>first_name, last_name, email, company, industry, title, city, state, custom_note</span>.
                Only <strong>email</strong> is required.
              </p>
              <form action={importCsvLeads} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="hidden" name="campaign_id" value={campaignId} />
                <input type="file" name="csv" accept=".csv,text/csv" required style={{ flex: '1 1 220px', padding: 8 }} />
                <button className="btn" type="submit">Import CSV &rarr;</button>
              </form>
            </div>

            {/* Paste */}
            <div style={{ marginTop: 18, borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 14 }}>
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                Or paste a quick list
              </p>
              <form action={importCampaignLeads}>
                <input type="hidden" name="campaign_id" value={campaignId} />
                <textarea name="list" required placeholder={'Dave, dave@acmeroofing.com, Acme Roofing\nSarah, sarah@brighthvac.co.uk, Bright HVAC'} style={{ minHeight: 90, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                <button className="btn" type="submit" style={{ marginTop: 10 }}>Import &rarr;</button>
              </form>
            </div>

            {/* Single */}
            <div style={{ marginTop: 18, borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 14 }}>
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Or add one by hand
              </p>
              <form action={addSingleLead}>
                <input type="hidden" name="campaign_id" value={campaignId} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <input name="first_name" placeholder="First name *" required style={{ flex: '1 1 130px' }} />
                  <input name="last_name" placeholder="Last name" style={{ flex: '1 1 130px' }} />
                  <input name="email" type="email" placeholder="Email *" required style={{ flex: '1 1 180px' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <input name="company" placeholder="Company" style={{ flex: '1 1 140px' }} />
                  <input name="industry" placeholder="Industry" style={{ flex: '1 1 120px' }} />
                  <input name="title" placeholder="Job title" style={{ flex: '1 1 130px' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <input name="city" placeholder="City" style={{ flex: '1 1 120px' }} />
                  <input name="state" placeholder="State" style={{ flex: '1 1 100px' }} />
                </div>
                <textarea name="custom_note" placeholder="Custom note, for the cold read: e.g. posts about hiring struggles, still tracks in spreadsheets" style={{ minHeight: 60, resize: 'vertical' }} />
                <button className="btn" type="submit" style={{ marginTop: 10 }}>+ Add lead</button>
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
                      <th style={{ padding: '10px 12px' }}>Deliverability</th>
                      <th style={{ padding: '10px 12px', minWidth: 210 }}>Status &amp; notes</th>
                      <th style={{ padding: '10px 12px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(l => {
                      const v = VSTYLE[bucket(l.validation_status)] || VSTYLE.unknown;
                      const initials = ((l.first_name?.[0] || '') + (l.last_name?.[0] || '')).toUpperCase() || '?';
                      const statusFormId = `lead-status-${l.id}`;
                      return (
                        <tr key={l.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)', verticalAlign: 'top' }}>
                          <td style={{ padding: '9px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', flex: 'none',
                                background: 'var(--paper2)', border: '1.5px solid var(--ink)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink)',
                              }}>
                                {initials}
                              </div>
                              <div>
                                <div>{[l.first_name, l.last_name].filter(Boolean).join(' ')}</div>
                                {l.title && <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{l.title}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="mono" style={{ padding: '9px 12px', fontSize: 12 }}>{l.email}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--ink3)' }}>{l.company || '—'}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: v.color }} title={l.validation_reason || ''}>
                              {v.label} {l.validation_score ? `(${l.validation_score}%)` : ''}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <input type="hidden" name="id" value={l.id} form={statusFormId} />
                            <select name="status" defaultValue={l.status} form={statusFormId} style={{ fontSize: 12, padding: '6px 8px', marginBottom: 5 }}>
                              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <textarea
                              name="notes" defaultValue={l.notes || ''} form={statusFormId}
                              placeholder="Notes, e.g. booked Friday 3pm"
                              style={{ fontSize: 12, padding: '6px 8px', minHeight: 38, resize: 'vertical' }}
                            />
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                            <form id={statusFormId} action={updateLeadStatus} style={{ display: 'none' }} />
                            <button type="submit" form={statusFormId} className="mono" style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', padding: 0, display: 'block', marginBottom: 6 }}>
                              Save
                            </button>
                            <form action={validateOneLead} style={{ marginBottom: 6 }}>
                              <input type="hidden" name="id" value={l.id} />
                              <input type="hidden" name="email" value={l.email} />
                              <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', padding: 0 }}>
                                Validate
                              </button>
                            </form>
                            <form action={deleteCampaignLead}>
                              <input type="hidden" name="id" value={l.id} />
                              <input type="hidden" name="campaign_id" value={campaignId} />
                              <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--brick)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', padding: 0 }}>
                                Delete
                              </button>
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
