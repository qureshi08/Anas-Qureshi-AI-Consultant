import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import ColdEmailNav from '../../components/ColdEmailNav';
import SendRunner from '../../components/SendRunner';
import SyncRepliesButton from '../../components/SyncRepliesButton';

export const dynamic = 'force-dynamic';

export default async function SendQueuePage({ searchParams }) {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('*').order('created_at', { ascending: false });
  const list = campaigns || [];
  const campaignId = searchParams?.campaign || (list[0] ? String(list[0].id) : '');
  const campaign = list.find(c => String(c.id) === String(campaignId));

  let leads = [];
  let logs = [];
  if (campaignId) {
    const { data: l } = await admin.from('leads').select('*').eq('campaign_id', campaignId);
    leads = l || [];
    const { data: lg } = await admin
      .from('email_logs').select('*').eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false }).limit(40);
    logs = lg || [];
  }

  const { data: accounts } = await admin.from('sending_accounts').select('*').eq('active', 1);
  const { data: delayRow } = await admin.from('settings').select('value').eq('key', 'delay_seconds').maybeSingle();

  const pending = leads.filter(l => l.status === 'pending');
  const sendable = pending.filter(l => ['SAFE', 'RISKY', 'ACCEPT_ALL'].includes(l.validation_status));
  const funnel = [
    ['Total leads', leads.length, 'var(--ink3)'],
    ['Ready to send', sendable.length, 'var(--amber)'],
    ['Sent', leads.filter(l => l.sent_at).length, 'var(--ink)'],
    ['Replied', leads.filter(l => l.status === 'replied').length, 'var(--forest)'],
    ['Booked', leads.filter(l => l.status === 'booked').length, 'var(--forest)'],
  ];

  const noInbox = !accounts || accounts.length === 0;
  const noTemplate = campaign && !campaign.body_template;

  return (
    <>
      <ColdEmailNav />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>Send queue</h2>
          <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Launch and watch it go
          </p>
        </div>
        <SyncRepliesButton />
      </div>

      {list.length === 0 && (
        <p style={{ color: 'var(--ink3)' }}>
          No campaigns yet. <Link href="/admin/campaigns" style={{ color: 'var(--brick)' }}>Create one &rarr;</Link>
        </p>
      )}

      {list.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {list.map(c => (
              <Link
                key={c.id}
                href={`/admin/send?campaign=${c.id}`}
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

          {(noInbox || noTemplate) && (
            <div className="card" style={{ marginBottom: 18, borderColor: 'var(--amber)', boxShadow: '4px 4px 0 var(--amber)' }}>
              <div className="tag" style={{ color: 'var(--amber)' }}>Not ready to send</div>
              <ul style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 8, paddingLeft: 18 }}>
                {noInbox && <li>No sending inbox connected. <Link href="/admin/inboxes" style={{ color: 'var(--brick)' }}>Add one &rarr;</Link></li>}
                {noTemplate && <li>This campaign has no email written. <Link href={`/admin/compose?campaign=${campaignId}`} style={{ color: 'var(--brick)' }}>Write it in Compose &rarr;</Link></li>}
              </ul>
            </div>
          )}

          {/* Funnel */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="tag">Campaign funnel</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              {funnel.map(([label, value, color]) => (
                <div key={label} style={{ flex: '1 1 100px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color, lineHeight: 1 }}>{value}</div>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {campaignId && (
            <SendRunner
              campaignId={Number(campaignId)}
              pendingCount={sendable.length}
              defaultDelay={Number(delayRow?.value) || 30}
            />
          )}

          {/* Log */}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', margin: '20px 0 10px' }}>Send log</h3>
          {logs.length === 0 && <p style={{ color: 'var(--ink3)' }}>Nothing sent from this campaign yet.</p>}
          {logs.length > 0 && (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', textAlign: 'left', borderBottom: '2px solid var(--ink)' }}>
                    <th style={{ padding: '10px 12px' }}>When</th>
                    <th style={{ padding: '10px 12px' }}>Subject</th>
                    <th style={{ padding: '10px 12px' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)' }}>
                      <td className="mono" style={{ padding: '8px 12px', fontSize: 11, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>
                        {l.sent_at ? new Date(l.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{l.subject}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className="mono" style={{
                          fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em',
                          color: l.status === 'sent' ? 'var(--forest)' : l.status === 'received' ? 'var(--amber)' : 'var(--brick)',
                        }} title={l.error || ''}>
                          {l.status === 'received' ? 'reply in' : l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
