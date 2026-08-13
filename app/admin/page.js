import Link from 'next/link';
import { createAdminClient } from '../../lib/supabase/admin';
import { STAGES, STAGE_LABEL } from './stages';

export const dynamic = 'force-dynamic';

// Funnel depth for each LinkedIn status, used to compute cumulative "reached
// at least this stage" counts. request_sent_no_note/with_note share a rank
// since they're the same funnel depth (a request out), just different
// tactics. 'lost' is deliberately excluded -- it's a terminal exit that can
// happen from any point in the funnel, not a depth of its own, so folding it
// into the rank order would silently understate whichever stage people were
// lost from. It's reported as its own rate instead.
const DM_RANK = {
  new: 0, request_sent_no_note: 1, request_sent_with_note: 1,
  connected: 2, dm_sent: 3, dm_read: 4, replied: 5, call: 6, won: 7,
};
const DM_FUNNEL = [
  { key: 'new', label: 'Sourced', rank: 0 },
  { key: 'request_sent', label: 'Request sent', rank: 1 },
  { key: 'connected', label: 'Connected', rank: 2 },
  { key: 'dm_sent', label: 'DM sent', rank: 3 },
  { key: 'dm_read', label: 'DM read', rank: 4 },
  { key: 'replied', label: 'Replied', rank: 5 },
  { key: 'call', label: 'Call booked', rank: 6 },
  { key: 'won', label: 'Won', rank: 7 },
];
// Email has no equivalent "connect first" step -- it goes straight to send.
// 'bounced' ranks alongside 'sent': a bounce can only happen after a send
// attempt, so it must still count as having reached that stage (it's a
// terminal outcome of sending, not a different depth) -- tracked separately
// as its own rate below, same treatment as 'lost' on the LinkedIn side.
const EMAIL_RANK = { pending: 0, sent: 1, bounced: 1, replied: 2, booked: 3 };
const EMAIL_FUNNEL = [
  { key: 'loaded', label: 'Loaded', rank: 0 },
  { key: 'sent', label: 'Sent', rank: 1 },
  { key: 'replied', label: 'Replied', rank: 2 },
  { key: 'booked', label: 'Booked', rank: 3 },
];

function pct(n, d) {
  if (!d) return null;
  return Math.round((n / d) * 100);
}

function FunnelBlock({ title, subtitle, rows, barColor }) {
  return (
    <div className="card" style={{ padding: '16px 18px', height: '100%' }}>
      <div className="tag">{title}</div>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, marginBottom: 12 }}>{subtitle}</p>}
      {rows.map((row, i) => (
        <div key={row.key} style={{ marginTop: i === 0 ? 12 : 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)' }}>{row.label}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>
              {row.reached} &middot; {row.pctOfTotal ?? 0}%{row.pctOfPrev !== null && row.pctOfPrev !== undefined ? ` (${row.pctOfPrev}% of prev)` : ''}
            </span>
          </div>
          <div style={{ background: 'rgba(26,18,5,0.08)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${row.pctOfTotal || 0}%`, height: '100%', background: i === rows.length - 1 ? 'var(--forest)' : barColor, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const { data: prospects } = await admin.from('prospects').select('status');
  const { data: allLeads } = await admin.from('leads').select('status');
  const { data: bookings } = await admin.from('bookings').select('status');
  const { data: inbound } = await admin.from('inbound_leads').select('id');
  const { data: conversations } = await admin.from('conversations').select('id, email');

  const ps = prospects || [];
  const leads = allLeads || [];
  const stageCount = (s) => ps.filter(p => p.status === s).length;
  const requestedCalls = (bookings || []).filter(b => b.status === 'requested').length;
  const chatLeads = (conversations || []).filter(c => c.email).length;

  // ---- Goal strip: the actual thing that matters, per goal.md ----
  const DEADLINE = new Date('2026-08-15T23:59:59');
  const daysLeft = Math.max(0, Math.ceil((DEADLINE - new Date()) / (1000 * 60 * 60 * 24)));
  const wonCount = stageCount('won'); // LinkedIn 'won' is the only closed-deal status tracked today; email has no won/lost concept yet, see note below.

  // ---- LinkedIn (Cold DM) funnel ----
  const dmLostCount = stageCount('lost');
  const dmActive = ps.filter(p => p.status !== 'lost');
  const dmReached = (rank) => dmActive.filter(p => DM_RANK[p.status] >= rank).length;
  const dmRows = DM_FUNNEL.map((s, i) => {
    const count = dmReached(s.rank);
    const prevCount = i === 0 ? dmActive.length : dmReached(DM_FUNNEL[i - 1].rank);
    return { ...s, reached: count, pctOfTotal: pct(count, dmActive.length), pctOfPrev: i === 0 ? null : pct(count, prevCount) };
  });
  const dmReplyRate = pct(dmReached(DM_RANK.replied), dmReached(DM_RANK.dm_sent));
  const dmCallRate = pct(dmReached(DM_RANK.call), dmReached(DM_RANK.replied));
  const dmWinRate = pct(wonCount, dmActive.length);

  // ---- Email (Cold Email) funnel, aggregated across every campaign ----
  const emailSkipped = leads.filter(l => l.status === 'skipped_role_address' || l.status === 'skipped_unverified').length;
  const emailActive = leads.filter(l => !String(l.status || '').startsWith('skipped_'));
  const emailReached = (rank) => emailActive.filter(l => (EMAIL_RANK[l.status] ?? -1) >= rank).length;
  const emailRows = EMAIL_FUNNEL.map((s, i) => {
    const count = emailReached(s.rank);
    const prevCount = i === 0 ? emailActive.length : emailReached(EMAIL_FUNNEL[i - 1].rank);
    return { ...s, reached: count, pctOfTotal: pct(count, emailActive.length), pctOfPrev: i === 0 ? null : pct(count, prevCount) };
  });
  const emailBouncedCount = leads.filter(l => l.status === 'bounced').length;
  const emailBounceRate = pct(emailBouncedCount, emailReached(EMAIL_RANK.sent));
  const emailReplyRate = pct(emailReached(EMAIL_RANK.replied), emailReached(EMAIL_RANK.sent));
  const emailBookRate = pct(emailReached(EMAIL_RANK.booked), emailReached(EMAIL_RANK.replied));

  return (
    <>
      {/* Goal strip -- everything below exists to move these three numbers. */}
      <div className="card" style={{ marginBottom: 24, borderColor: daysLeft <= 3 ? 'var(--brick)' : 'var(--ink)', boxShadow: `4px 4px 0 ${daysLeft <= 3 ? 'var(--brick)' : 'var(--ink)'}` }}>
        <div className="tag">The goal · goal.md</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: daysLeft <= 3 ? 'var(--brick)' : 'var(--ink)' }}>{daysLeft} days left</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>to Aug 15, 2026</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: wonCount >= 1 ? 'var(--forest)' : 'var(--ink)' }}>{wonCount} of 1</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>direct client won, $300+ min</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
          Official touch count lives in <span className="mono">system/rep-counter.md</span>, not here -- the numbers below are pipeline state, not the daily rep log.
        </p>
      </div>

      {/* Channel comparison -- which one is actually converting, side by side. */}
      <div className="tag" style={{ marginBottom: 10 }}>LinkedIn vs Email &middot; same metrics, side by side</div>
      <div className="card" style={{ marginBottom: 24, padding: '16px 18px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
          <thead>
            <tr className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink3)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}></th>
              <th style={{ padding: '4px 8px' }}>Touched</th>
              <th style={{ padding: '4px 8px' }}>Reply rate</th>
              <th style={{ padding: '4px 8px' }}>Call/book rate</th>
              <th style={{ padding: '4px 8px' }}>Won</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: '1.5px dashed rgba(26,18,5,0.15)' }}>
              <td style={{ padding: '8px', fontFamily: 'var(--font-display)', fontSize: 16 }}>LinkedIn</td>
              <td style={{ padding: '8px' }}>{dmReached(DM_RANK.dm_sent)} DMed</td>
              <td style={{ padding: '8px' }}>{dmReplyRate ?? '—'}%</td>
              <td style={{ padding: '8px' }}>{dmCallRate ?? '—'}%</td>
              <td style={{ padding: '8px', color: wonCount > 0 ? 'var(--forest)' : 'var(--ink)' }}>{wonCount}</td>
            </tr>
            <tr style={{ borderTop: '1.5px dashed rgba(26,18,5,0.15)' }}>
              <td style={{ padding: '8px', fontFamily: 'var(--font-display)', fontSize: 16 }}>Email</td>
              <td style={{ padding: '8px' }}>{emailReached(EMAIL_RANK.sent)} sent</td>
              <td style={{ padding: '8px' }}>{emailReplyRate ?? '—'}%</td>
              <td style={{ padding: '8px' }}>{emailBookRate ?? '—'}%</td>
              <td style={{ padding: '8px', color: 'var(--ink3)' }}>n/a*</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 8 }}>
          *Email has no "won" status tracked yet, only booked -- a real gap, not a zero. If a cold-email reply actually closes, it'd currently only show as "booked" here with no path to "won."
        </p>
      </div>

      {/* Two funnels, side by side, never blended -- three-lead-lanes.md */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        <FunnelBlock
          title="LinkedIn outreach"
          subtitle={`Hand-sourced targets, sent by hand. Excludes ${dmLostCount} lost.`}
          rows={dmRows}
          barColor="var(--amber)"
        />
        <FunnelBlock
          title="Email outreach"
          subtitle={`Bulk via OutboundOS. Excludes ${emailSkipped} parked (role address / unverified, never sendable).`}
          rows={emailRows}
          barColor="var(--brick)"
        />
      </div>
      {(emailBounceRate !== null) && (
        <p style={{ fontSize: 12, color: emailBounceRate > 5 ? 'var(--brick)' : 'var(--ink3)', marginTop: -12, marginBottom: 24 }}>
          Email bounce rate: {emailBounceRate}% of sent {emailBounceRate > 5 ? '— above the 5% watch threshold, check the send queue.' : ''}
        </p>
      )}

      {/* Raw per-stage counts -- kept for anyone who wants the exact bucket sizes, not just rates. */}
      <details style={{ marginBottom: 24 }}>
        <summary className="mono" style={{ cursor: 'pointer', fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Raw LinkedIn stage counts</summary>
        <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          {[['Prospects', ps.length], ...STAGES.map(s => [STAGE_LABEL[s], stageCount(s)])].map(([lbl, val], i) => (
            <div key={i} className="card" style={{ flex: '1 1 110px', padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--ink)', lineHeight: 1 }}>{val}</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{lbl}</div>
            </div>
          ))}
        </section>
      </details>

      <Link href="/admin/calls" style={{ textDecoration: 'none' }}>
        <div className="card" style={{ marginBottom: 28, borderColor: requestedCalls > 0 ? 'var(--brick)' : 'var(--ink)', boxShadow: requestedCalls > 0 ? '4px 4px 0 var(--brick)' : '4px 4px 0 var(--ink)' }}>
          <div className="tag">Call requests</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{requestedCalls} waiting</div>
          <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>The hottest thing in the funnel. Confirm times by email.</p>
        </div>
      </Link>

      <div className="tag" style={{ marginBottom: 10 }}>The three lead lanes &middot; kept separate on purpose</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <Link href="/admin/outbound" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="tag">1 &middot; Cold DM</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{stageCount('new')} untouched</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>
              Hand-sourced on LinkedIn, personalised one at a time, sent by hand. {ps.length} total.
            </p>
          </div>
        </Link>

        <Link href="/admin/campaigns" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="tag">2 &middot; Cold email</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{leads.length} leads</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>
              Sourced automatically, sent in bulk by OutboundOS.
            </p>
          </div>
        </Link>

        <Link href="/admin/inbound" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="tag">3 &middot; Inbound</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{(inbound || []).length} total</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>
              They came to you. Plus {chatLeads} email-verified from the AI assistant.
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}
