import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import ColdEmailNav from '../../components/ColdEmailNav';
import SendRunner from '../../components/SendRunner';
import SyncRepliesButton from '../../components/SyncRepliesButton';
import OutboundActionButton from '../../components/OutboundActionButton';
import ReplyToLead from '../../components/ReplyToLead';

export const dynamic = 'force-dynamic';

export default async function SendQueuePage({ searchParams }) {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('*').order('created_at', { ascending: false });
  const list = campaigns || [];
  const campaignId = searchParams?.campaign || (list[0] ? String(list[0].id) : '');
  const campaign = list.find(c => String(c.id) === String(campaignId));
  const safety = searchParams?.safety || 'SAFE_RISKY';

  let leads = [];
  let logs = [];
  let steps = [];
  if (campaignId) {
    const { data: l } = await admin.from('leads').select('*').eq('campaign_id', campaignId);
    leads = l || [];
    const { data: lg } = await admin
      .from('email_logs').select('*, leads(first_name, last_name, email, company, status)')
      .eq('campaign_id', campaignId).order('sent_at', { ascending: false }).limit(50);
    logs = lg || [];
    const { data: st } = await admin
      .from('campaign_steps').select('*').eq('campaign_id', campaignId).order('step_number');
    steps = st || [];
  }

  const { data: accounts } = await admin.from('sending_accounts').select('*').eq('active', 1);
  const { data: delayRow } = await admin.from('settings').select('value').eq('key', 'delay_seconds').maybeSingle();

  const pending = leads.filter(l => l.status === 'pending');
  const eligible = safety === 'SAFE_ONLY'
    ? pending.filter(l => l.validation_status === 'SAFE')
    : safety === 'ALL'
      ? pending.filter(l => l.validation_status !== 'INVALID')
      : pending.filter(l => ['SAFE', 'RISKY', 'ACCEPT_ALL'].includes(l.validation_status));

  const sentCount = leads.filter(l => l.sent_at).length;
  const repliedCount = leads.filter(l => l.status === 'replied').length;
  const bookedCount = leads.filter(l => l.status === 'booked').length;
  const bouncedCount = leads.filter(l => l.status === 'bounced').length;
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);
  const bounceRate = pct(bouncedCount, sentCount) ?? 0;
  const replyRate = pct(repliedCount, sentCount);
  const bookRate = pct(bookedCount, repliedCount);

  // Per-step funnel: how many leads got at least this far, and how many replied.
  const stepStats = steps.map(s => {
    const reached = leads.filter(l => (l.current_step || 1) >= s.step_number && l.sent_at).length;
    const replied = leads.filter(l => (l.current_step || 1) >= s.step_number && ['replied', 'booked'].includes(l.status)).length;
    return {
      n: s.step_number,
      subject: s.subject_template || `Step ${s.step_number} (same thread)`,
      reached,
      replied,
      rate: reached ? Math.round((replied / reached) * 100) : 0,
    };
  });

  const noInbox = !accounts || accounts.length === 0;
  const noTemplate = campaign && !campaign.body_template;

  const SAFETY_OPTS = [
    ['SAFE_ONLY', 'Strict: safe only'],
    ['SAFE_RISKY', 'Balanced: safe + unverified'],
    ['ALL', 'Aggressive: all but invalid'],
  ];

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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <SyncRepliesButton />
          <OutboundActionButton
            endpoint="/api/outbound/process-follow-ups"
            label="Process follow-ups"
            busyLabel="Processing…"
          />
        </div>
      </div>

      {list.length === 0 && (
        <p style={{ color: 'var(--ink3)' }}>
          No campaigns yet. <Link href="/admin/campaigns" style={{ color: 'var(--brick)' }}>Create one &rarr;</Link>
        </p>
      )}

      {list.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {list.map(c => (
              <Link
                key={c.id}
                href={`/admin/send?campaign=${c.id}&safety=${safety}`}
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

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {SAFETY_OPTS.map(([key, label]) => (
              <Link
                key={key}
                href={`/admin/send?campaign=${campaignId}&safety=${key}`}
                className="mono"
                style={{
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
                  padding: '5px 11px', borderRadius: 6,
                  border: `1.5px solid ${safety === key ? 'var(--ink)' : 'rgba(26,18,5,0.2)'}`,
                  color: safety === key ? 'var(--ink)' : 'var(--ink3)',
                  background: safety === key ? 'var(--paper2)' : 'transparent',
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {(noInbox || noTemplate) && (
            <div className="card" style={{ marginBottom: 18, borderColor: 'var(--amber)', boxShadow: '4px 4px 0 var(--amber)' }}>
              <div className="tag" style={{ color: 'var(--amber)' }}>Not ready to send</div>
              <ul style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 8, paddingLeft: 18 }}>
                {noInbox && <li>No sending inbox connected. <Link href="/admin/inboxes" style={{ color: 'var(--brick)' }}>Add one &rarr;</Link></li>}
                {noTemplate && <li>No email written for this campaign. <Link href={`/admin/compose?campaign=${campaignId}`} style={{ color: 'var(--brick)' }}>Write it &rarr;</Link></li>}
              </ul>
            </div>
          )}

          {/* Summary */}
          {campaign && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="tag">This campaign</div>
              <div style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 8, lineHeight: 1.7 }}>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--ink)' }}>{campaign.name}</strong><br />
                Goal: {campaign.goal}{campaign.platform ? ` · Platform: ${campaign.platform}` : ''}<br />
                Pending: {pending.length} · <strong>Eligible under this filter: {eligible.length}</strong><br />
                Email: {campaign.subject_template ? 'ready' : 'not written yet'}
              </div>
            </div>
          )}

          {/* Funnel */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="tag">Campaign funnel</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, marginBottom: stepStats.length ? 20 : 0 }}>
              {[
                ['Total', leads.length, 'var(--ink3)', null],
                ['Eligible', eligible.length, 'var(--amber)', pct(eligible.length, leads.length)],
                ['Sent', sentCount, 'var(--ink)', pct(sentCount, eligible.length)],
                ['Bounced', bouncedCount, bounceRate > 5 ? 'var(--brick)' : 'var(--ink3)', bounceRate],
                ['Replied', repliedCount, 'var(--forest)', replyRate],
                ['Booked', bookedCount, 'var(--forest)', bookRate],
              ].map(([label, value, color, rate]) => (
                <div key={label} style={{ flex: '1 1 90px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color, lineHeight: 1 }}>{value}</div>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{label}</div>
                  {rate !== null && <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>{rate}%</div>}
                </div>
              ))}
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink3)', marginBottom: stepStats.length ? 16 : 0 }}>
              % of: Eligible/Total &middot; Sent/Eligible &middot; Bounced+Replied/Sent &middot; Booked/Replied
            </div>

            {stepStats.length > 0 && (
              <div style={{ borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 14 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
                  Reply rate by step
                </div>
                {stepStats.map(s => (
                  <div key={s.n} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 5 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Step {s.n}: {s.subject}
                      </span>
                      <strong className="mono" style={{ fontSize: 12, color: 'var(--forest)', whiteSpace: 'nowrap' }}>{s.rate}%</strong>
                    </div>
                    <div style={{ height: 8, background: 'var(--paper2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.rate}%`, background: 'var(--forest)' }} />
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 4 }}>
                      Reached {s.reached} · Replies {s.replied}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {campaignId && (
            <SendRunner
              campaignId={Number(campaignId)}
              pendingCount={eligible.length}
              defaultDelay={Number(delayRow?.value) || 30}
              safetyFilter={safety}
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
                    <th style={{ padding: '10px 12px' }}>Name</th>
                    <th style={{ padding: '10px 12px' }}>Email</th>
                    <th style={{ padding: '10px 12px' }}>Company</th>
                    <th style={{ padding: '10px 12px' }}>Subject</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => {
                    const lead = l.leads || {};
                    const leadStatus = lead.status || '—';
                    const canReply = ['replied', 'booked'].includes(leadStatus);
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)', verticalAlign: 'top' }}>
                        <td style={{ padding: '9px 12px' }}>{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}</td>
                        <td className="mono" style={{ padding: '9px 12px', fontSize: 12 }}>{lead.email || '—'}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--ink3)' }}>{lead.company || '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, maxWidth: 220 }}>{l.subject}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span className="mono" style={{
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em',
                            color: l.status === 'received' ? 'var(--amber)' : canReply ? 'var(--forest)' : l.status === 'failed' ? 'var(--brick)' : 'var(--ink3)',
                          }} title={l.error || ''}>
                            {l.status === 'received' ? 'reply in' : leadStatus}
                          </span>
                          {canReply && l.lead_id && (
                            <div style={{ marginTop: 4 }}>
                              <ReplyToLead leadId={l.lead_id} email={lead.email} />
                            </div>
                          )}
                        </td>
                        <td className="mono" style={{ padding: '9px 12px', fontSize: 11, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>
                          {l.sent_at ? new Date(l.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
