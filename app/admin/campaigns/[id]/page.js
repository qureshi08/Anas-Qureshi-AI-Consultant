import Link from 'next/link';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { saveSequence, importCampaignLeads, validateCampaign, deleteCampaignLead, resetCampaignLead } from '../../outbound-actions';
import SendRunner from '../../../components/SendRunner';
import ColdEmailNav from '../../../components/ColdEmailNav';

export const dynamic = 'force-dynamic';

const VSTYLE = {
  SAFE: { color: 'var(--forest)', label: 'Safe' },
  RISKY: { color: 'var(--amber)', label: 'Unverified' },
  ACCEPT_ALL: { color: 'var(--amber)', label: 'Catch-all' },
  INVALID: { color: 'var(--brick)', label: 'Invalid' },
  unknown: { color: 'var(--ink3)', label: 'Not checked' },
};

export default async function CampaignDetailPage({ params }) {
  const admin = createAdminClient();
  const { id } = params;

  const { data: campaign } = await admin.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) {
    return (
      <>
        <Link href="/admin/campaigns" className="mono" style={{ fontSize: 12, color: 'var(--brick)' }}>&larr; Cold email</Link>
        <p style={{ marginTop: 16 }}>Campaign not found.</p>
      </>
    );
  }

  const { data: steps } = await admin.from('campaign_steps').select('*').eq('campaign_id', id).order('step_number');
  const { data: leads } = await admin.from('leads').select('*').eq('campaign_id', id).order('id', { ascending: true });
  const { data: settingRows } = await admin.from('settings').select('key, value').eq('key', 'delay_seconds').maybeSingle();

  const all = leads || [];
  const pending = all.filter(l => l.status === 'pending');
  const sent = all.filter(l => l.status === 'sent');
  const replied = all.filter(l => l.status === 'replied' || l.status === 'booked');
  const unchecked = all.filter(l => !l.validation_status || l.validation_status === 'unknown');
  const stepList = steps && steps.length ? steps : [{ step_number: 1, subject_template: '', body_template: '', delay_days: 3 }];

  return (
    <>
      <ColdEmailNav />
      <Link href="/admin/campaigns" className="mono" style={{ fontSize: 12, color: 'var(--brick)', textDecoration: 'none' }}>&larr; All campaigns</Link>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)', margin: '8px 0 2px' }}>{campaign.name}</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>
        {campaign.goal}{campaign.icp ? ` · ${campaign.icp}` : ''} &middot; {campaign.status}
      </p>

      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {[['Leads', all.length], ['Pending', pending.length], ['Sent', sent.length], ['Replied', replied.length]].map(([lbl, val], i) => (
          <div key={i} className="card" style={{ flex: '1 1 100px', padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', lineHeight: 1 }}>{val}</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{lbl}</div>
          </div>
        ))}
      </section>

      <SendRunner
        campaignId={Number(id)}
        pendingCount={pending.length}
        defaultDelay={Number(settingRows?.value) || 30}
      />

      {/* ── SEQUENCE ── */}
      <details className="card" style={{ marginBottom: 16 }} open={!campaign.body_template}>
        <summary className="mono" style={{ cursor: 'pointer', fontSize: 12, color: 'var(--brick)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          The emails &middot; {stepList.length} step{stepList.length === 1 ? '' : 's'}
        </summary>
        <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '12px 0' }}>
          Step 1 is the first touch. Later steps go out as replies on the same thread after the delay.
          Use <span className="mono" style={{ fontSize: 12 }}>{'{{first_name}}'}</span>,{' '}
          <span className="mono" style={{ fontSize: 12 }}>{'{{company}}'}</span>,{' '}
          <span className="mono" style={{ fontSize: 12 }}>{'{{city}}'}</span>,{' '}
          <span className="mono" style={{ fontSize: 12 }}>{'{{title}}'}</span> to personalise.
        </p>

        <form action={saveSequence}>
          <input type="hidden" name="campaign_id" value={id} />
          {[0, 1, 2].map(i => {
            const step = stepList[i] || { subject_template: '', body_template: '', delay_days: 3 };
            return (
              <div key={i} style={{ borderTop: i > 0 ? '1.5px dashed rgba(26,18,5,0.15)' : 'none', paddingTop: i > 0 ? 14 : 0, marginTop: i > 0 ? 14 : 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    Step {i + 1}{i === 0 ? ' (first touch)' : ''}
                  </span>
                  {i > 0 && (
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>
                      after <input name="delay" type="number" min="1" defaultValue={step.delay_days || 3} style={{ width: 58, padding: '4px 8px', fontSize: 12, display: 'inline-block' }} /> days
                    </span>
                  )}
                  {i === 0 && <input type="hidden" name="delay" value="0" />}
                </div>
                <input name="subject" placeholder={i === 0 ? 'Subject line' : 'Subject (leave blank to reply on the same thread)'} defaultValue={step.subject_template || ''} style={{ marginBottom: 8 }} />
                <textarea name="body" placeholder={i === 0 ? 'Hi {{first_name}}, ...' : 'Following up on this...'} defaultValue={step.body_template || ''} style={{ minHeight: 110, resize: 'vertical' }} />
              </div>
            );
          })}
          <button className="btn" type="submit" style={{ marginTop: 14 }}>Save sequence</button>
        </form>
      </details>

      {/* ── ADD LEADS ── */}
      <details className="card" style={{ marginBottom: 16 }}>
        <summary className="mono" style={{ cursor: 'pointer', fontSize: 12, color: 'var(--brick)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Add leads
        </summary>
        <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '12px 0' }}>
          One per line: <span className="mono" style={{ fontSize: 12 }}>Name, email@company.com, Company</span>.
          This is the lane for scraped lists (Google Maps), not hand-sourced DM prospects.
        </p>
        <form action={importCampaignLeads}>
          <input type="hidden" name="campaign_id" value={id} />
          <textarea name="list" required placeholder={'Dave, dave@acmeroofing.com, Acme Roofing\nSarah, sarah@brighthvac.co.uk, Bright HVAC'} style={{ minHeight: 110, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
          <button className="btn" type="submit" style={{ marginTop: 10 }}>Import &rarr;</button>
        </form>
      </details>

      {/* ── LEADS TABLE ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)' }}>Leads</h3>
        {unchecked.length > 0 && (
          <form action={validateCampaign}>
            <input type="hidden" name="campaign_id" value={id} />
            <button className="btn" type="submit" style={{ fontSize: 14, padding: '8px 16px' }}>
              Check {Math.min(unchecked.length, 40)} unchecked
            </button>
          </form>
        )}
      </div>

      {all.length === 0 && <p style={{ color: 'var(--ink3)' }}>No leads yet. Add some above.</p>}

      {all.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
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
              {all.map(l => {
                const v = VSTYLE[l.validation_status] || VSTYLE.unknown;
                return (
                  <tr key={l.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)' }}>
                    <td style={{ padding: '9px 12px' }}>{l.first_name}</td>
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
                          <input type="hidden" name="campaign_id" value={id} />
                          <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase' }}>Reset</button>
                        </form>
                      )}
                      <form action={deleteCampaignLead} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="campaign_id" value={id} />
                        <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--brick)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', marginLeft: 8 }}>Delete</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
