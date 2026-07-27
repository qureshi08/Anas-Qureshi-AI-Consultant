import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import { validateCampaign } from '../outbound-actions';
import ColdEmailNav from '../../components/ColdEmailNav';
import SingleEmailCheck from '../../components/SingleEmailCheck';

export const dynamic = 'force-dynamic';

const WHY = [
  ['Avoid bounces', 'High bounce rates tell Google you are a spammer. Keeping bounces under 1% is critical.'],
  ['Protect domain health', 'A healthy domain keeps you in the primary inbox instead of promotions or spam.'],
  ['Save time', 'Do not burn a whole follow-up sequence on an address that never existed.'],
];

export default async function ValidatorPage({ searchParams }) {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('id, name').order('created_at', { ascending: false });
  const list = campaigns || [];
  const campaignId = searchParams?.campaign || (list[0] ? String(list[0].id) : '');

  let leads = [];
  if (campaignId) {
    const { data } = await admin.from('leads').select('validation_status').eq('campaign_id', campaignId);
    leads = data || [];
  }
  const unchecked = leads.filter(l => !l.validation_status || l.validation_status === 'unknown').length;
  const checked = leads.length - unchecked;
  const pct = leads.length ? Math.round((checked / leads.length) * 100) : 0;

  const buckets = [
    ['SAFE', 'Safe', 'var(--forest)'],
    ['RISKY', 'Unverified', 'var(--amber)'],
    ['ACCEPT_ALL', 'Catch-all', 'var(--amber)'],
    ['INVALID', 'Do not send', 'var(--brick)'],
  ].map(([key, label, color]) => [label, leads.filter(l => l.validation_status === key).length, color]);

  return (
    <>
      <ColdEmailNav />

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>Validator</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>
        Clean the list before you burn your domain on it
      </p>

      <div className="card" style={{ marginBottom: 20, borderColor: 'var(--amber)', boxShadow: '4px 4px 0 var(--amber)' }}>
        <div className="tag" style={{ color: 'var(--amber)' }}>What this can and cannot tell you</div>
        <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 6 }}>
          It checks syntax, throwaway domains, role addresses, and does a real DNS lookup to confirm the
          domain accepts mail at all. That catches typos and dead domains, which is most of what wrecks a list.
          It cannot confirm an individual mailbox exists, because that needs an SMTP probe on port 25 and
          every serverless host blocks it. So the best verdict here is <strong>Unverified</strong>, never Safe.
          For true mailbox verification you would need a paid service like ZeroBounce.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <SingleEmailCheck />

        <div className="card">
          <div className="tag">Check a whole campaign</div>
          {list.length === 0 && (
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 8 }}>
              No campaigns yet. <Link href="/admin/campaigns" style={{ color: 'var(--brick)' }}>Create one &rarr;</Link>
            </p>
          )}

          {list.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
                {list.map(c => (
                  <Link
                    key={c.id}
                    href={`/admin/validator?campaign=${c.id}`}
                    className="mono"
                    style={{
                      fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
                      padding: '5px 11px', border: '1.5px solid var(--ink)', borderRadius: 6,
                      color: String(c.id) === String(campaignId) ? 'var(--paper)' : 'var(--ink)',
                      background: String(c.id) === String(campaignId) ? 'var(--ink)' : 'transparent',
                    }}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>

              <div style={{ height: 6, background: 'var(--paper2)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--forest)' }} />
              </div>
              <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 12 }}>
                {checked} of {leads.length} checked
              </p>

              {unchecked > 0 ? (
                <form action={validateCampaign}>
                  <input type="hidden" name="campaign_id" value={campaignId} />
                  <button className="btn" type="submit" style={{ width: '100%' }}>
                    Check {Math.min(unchecked, 40)} unchecked
                  </button>
                  {unchecked > 40 && (
                    <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 8 }}>
                      Runs 40 at a time so it finishes inside the request. Click again for the next batch.
                    </p>
                  )}
                </form>
              ) : (
                <p className="mono" style={{ fontSize: 11, color: 'var(--forest)' }}>
                  {leads.length ? 'All checked.' : 'No leads in this campaign yet.'}
                </p>
              )}

              {leads.length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14, borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 12 }}>
                  {buckets.map(([label, count, color]) => (
                    <div key={label} style={{ flex: '1 1 70px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color, lineHeight: 1 }}>{count}</div>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', marginBottom: 10 }}>Why bother</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {WHY.map(([title, desc]) => (
          <div key={title} className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>{title}</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 4 }}>{desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}
