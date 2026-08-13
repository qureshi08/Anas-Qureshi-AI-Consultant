import Link from 'next/link';
import { createAdminClient } from '../../lib/supabase/admin';
import { STAGES, STAGE_LABEL } from './stages';

export const dynamic = 'force-dynamic';

// Funnel depth for each status, used to compute cumulative "reached at least
// this stage" counts. request_sent_no_note/with_note share a rank since
// they're the same funnel depth (a request out), just different tactics.
// 'lost' is deliberately excluded -- it's a terminal exit that can happen
// from any point in the funnel, not a depth of its own, so folding it into
// the rank order would silently understate whichever stage people were lost
// from. It's reported as its own rate instead.
const RANK = {
  new: 0,
  request_sent_no_note: 1,
  request_sent_with_note: 1,
  connected: 2,
  dm_sent: 3,
  dm_read: 4,
  replied: 5,
  call: 6,
  won: 7,
};

const FUNNEL = [
  { key: 'new', label: 'Sourced', rank: 0 },
  { key: 'request_sent', label: 'Request sent', rank: 1 },
  { key: 'connected', label: 'Connected', rank: 2 },
  { key: 'dm_sent', label: 'DM sent', rank: 3 },
  { key: 'dm_read', label: 'DM read', rank: 4 },
  { key: 'replied', label: 'Replied', rank: 5 },
  { key: 'call', label: 'Call booked', rank: 6 },
  { key: 'won', label: 'Won', rank: 7 },
];

function pct(n, d) {
  if (!d) return null;
  return Math.round((n / d) * 100);
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const { data: prospects } = await admin.from('prospects').select('status');
  const { data: bookings } = await admin.from('bookings').select('status');
  const { data: inbound } = await admin.from('inbound_leads').select('id');
  const { data: conversations } = await admin.from('conversations').select('id, email');
  const { data: emailLeads } = await admin.from('leads').select('id');

  const ps = prospects || [];
  const stageCount = (s) => ps.filter(p => p.status === s).length;
  const requestedCalls = (bookings || []).filter(b => b.status === 'requested').length;
  const chatLeads = (conversations || []).filter(c => c.email).length;

  const lostCount = stageCount('lost');
  const active = ps.filter(p => p.status !== 'lost'); // funnel math excludes lost, see RANK comment
  const reached = (rank) => active.filter(p => RANK[p.status] >= rank).length;
  const funnelRows = FUNNEL.map((s, i) => {
    const count = reached(s.rank);
    const prevCount = i === 0 ? active.length : reached(FUNNEL[i - 1].rank);
    return {
      ...s,
      reached: count,
      pctOfTotal: pct(count, active.length),
      pctOfPrev: i === 0 ? null : pct(count, prevCount),
    };
  });

  const acceptRate = pct(reached(RANK.connected), reached(RANK.request_sent_no_note));
  const replyRate = pct(reached(RANK.replied), reached(RANK.dm_sent));
  const callRate = pct(reached(RANK.call), reached(RANK.replied));
  const winRate = pct(stageCount('won'), active.length);
  const lostRate = pct(lostCount, ps.length);

  const KPI_TILES = [
    ['Accept rate', acceptRate, 'of requests sent, accepted'],
    ['Reply rate', replyRate, 'of DMs sent, replied'],
    ['Call rate', callRate, 'of replies, booked a call'],
    ['Win rate', winRate, 'of active pipeline, won'],
    ['Lost rate', lostRate, 'of everyone ever logged, lost'],
  ];

  return (
    <>
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[['Prospects', ps.length], ...STAGES.map(s => [STAGE_LABEL[s], stageCount(s)])].map(([lbl, val], i) => (
          <div key={i} className="card" style={{ flex: '1 1 110px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, color: 'var(--ink)', lineHeight: 1 }}>{val}</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{lbl}</div>
          </div>
        ))}
      </section>

      {/* KPI rates -- the numbers that actually say whether this is working,
          not just how many people are sitting where. */}
      <div className="tag" style={{ marginBottom: 10 }}>Cold DM conversion rates</div>
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        {KPI_TILES.map(([lbl, val, sub], i) => (
          <div key={i} className="card" style={{ flex: '1 1 150px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30,
              color: val === null ? 'var(--ink3)' : (lbl === 'Lost rate' && val > 30) ? 'var(--brick)' : 'var(--ink)',
              lineHeight: 1,
            }}>
              {val === null ? '—' : `${val}%`}
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{lbl}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </section>

      {/* Funnel -- cumulative "reached at least this stage" counts, since
          the raw per-stage buckets above can't show conversion on their own
          (someone who replied is no longer sitting in the dm_sent bucket). */}
      <div className="tag" style={{ marginBottom: 10 }}>Cold DM funnel &middot; excludes {lostCount} lost</div>
      <div className="card" style={{ marginBottom: 28, padding: '16px 18px' }}>
        {funnelRows.map((row, i) => (
          <div key={row.key} style={{ marginBottom: i === funnelRows.length - 1 ? 0 : 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>{row.label}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {row.reached} &middot; {row.pctOfTotal}% of total
                {row.pctOfPrev !== null && ` · ${row.pctOfPrev}% of previous stage`}
              </span>
            </div>
            <div style={{ background: 'rgba(26,18,5,0.08)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{
                width: `${row.pctOfTotal || 0}%`, height: '100%',
                background: i === funnelRows.length - 1 ? 'var(--forest)' : 'var(--amber)',
                borderRadius: 6,
              }} />
            </div>
          </div>
        ))}
      </div>

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
              Hand-sourced on LinkedIn and Reddit, personalised one at a time. {ps.length} total.
            </p>
          </div>
        </Link>

        <Link href="/admin/campaigns" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="tag">2 &middot; Cold email</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{(emailLeads || []).length} leads</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>
              Scraped from Google Maps, sent in bulk by OutboundOS.
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
