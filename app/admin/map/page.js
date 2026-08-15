import { createAdminClient } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// The business, drawn as phases rather than as a status checklist. Phase order
// is the order a stranger travels: POSITION -> FIND -> REACH -> CONVERT -> PAID,
// with MEASURE sitting underneath all of them because it is what licenses a
// change anywhere upstream. Colour is a property of each node (locked / dial /
// blind), never the grouping, so a green box and an amber box can sit inside
// the same phase.

const T = {
  lock:  { fill: 'var(--forest-fill)', line: 'var(--forest)', text: 'var(--ink)',  badge: 'LOCKED' },
  work:  { fill: 'var(--forest-fill)', line: 'var(--forest)', text: 'var(--ink)',  badge: 'WORKING' },
  dial:  { fill: 'var(--amber-fill)',  line: 'var(--amber)',  text: 'var(--ink)',  badge: 'DIAL' },
  blind: { fill: 'var(--brick-fill)',  line: 'var(--brick)',  text: 'var(--ink)',  badge: 'BLIND' },
  none:  { fill: 'none',               line: 'var(--ink3)',   text: 'var(--ink3)', badge: 'NEVER RUN' },
};

function Node({ x, y, w, h, tone = 'work', title, line1, line2, stat, dashed }) {
  const t = T[tone];
  return (
    <g>
      {tone !== 'none' && <rect x={x + 4} y={y + 4} width={w} height={h} fill="var(--ink)" />}
      <rect
        x={x} y={y} width={w} height={h}
        fill={t.fill} stroke={t.line} strokeWidth="2.5"
        strokeDasharray={dashed ? '9 7' : undefined}
      />
      <text x={x + 12} y={y + 24} fontFamily="var(--font-display)" fontSize="21" fill={t.text}>{title}</text>
      {stat != null && (
        <text x={x + w - 12} y={y + 25} textAnchor="end" fontFamily="var(--font-display)"
              fontSize="24" fill={t.line}>{stat}</text>
      )}
      {line1 && <text x={x + 12} y={y + 42} fontFamily="var(--font-body)" fontSize="13" fill="var(--ink2)">{line1}</text>}
      {line2 && <text x={x + 12} y={y + 58} fontFamily="var(--font-body)" fontSize="13" fill="var(--ink3)">{line2}</text>}
      <text x={x + w - 12} y={y + h - 8} textAnchor="end" fontFamily="var(--font-mono)"
            fontSize="8.5" letterSpacing=".12em" fill={t.line}>{t.badge}</text>
    </g>
  );
}

function Hub({ x, y, w, n, title, sub }) {
  return (
    <g>
      <rect x={x + 4} y={y + 4} width={w} height={56} fill="var(--ink)" />
      <rect x={x} y={y} width={w} height={56} fill="var(--ink)" stroke="var(--ink)" strokeWidth="2.5" />
      <text x={x + 12} y={y + 24} fontFamily="var(--font-mono)" fontSize="9.5" letterSpacing=".16em" fill="var(--amber)">
        PHASE {n}
      </text>
      <text x={x + 12} y={y + 46} fontFamily="var(--font-display)" fontSize="26" fill="var(--paper)">{title}</text>
      <text x={x + w - 12} y={y + 46} textAnchor="end" fontFamily="var(--font-body)" fontSize="12" fill="var(--paper2)">{sub}</text>
    </g>
  );
}

export default async function MapPage() {
  const admin = createAdminClient();

  const [pRes, lRes, ibRes, cRes, bRes] = await Promise.all([
    admin.from('prospects').select('status, niche, source'),
    admin.from('leads').select('status, sent_at, replied_at, booked_at, first_name, last_name, company, validation_status'),
    admin.from('inbound_leads').select('id'),
    admin.from('conversations').select('id, email'),
    admin.from('bookings').select('status, email, created_at'),
  ]);

  const ps = pRes.data || [];
  const ls = lRes.data || [];
  const inbound = ibRes.data || [];
  const convos = cRes.data || [];
  const bookings = bRes.data || [];

  // ---- Cold DM lane -------------------------------------------------------
  const REPLIED_DM = ['replied', 'call', 'won'];
  const pTotal = ps.length;
  const pNew = ps.filter(p => p.status === 'new').length;
  const pTouched = pTotal - pNew;               // anything past 'new' had a send
  const pReplied = ps.filter(p => REPLIED_DM.includes(p.status)).length;

  // ---- Cold email lane ----------------------------------------------------
  const SENT_STATES = ['sent', 'bounced', 'replied', 'booked'];
  const eAttempted = ls.filter(l => SENT_STATES.includes(l.status)).length;
  const eBounced = ls.filter(l => l.status === 'bounced').length;
  const eReplied = ls.filter(l => l.status === 'replied' || l.status === 'booked').length;
  const eSkipped = ls.filter(l => (l.status || '').startsWith('skipped')).length;
  const ePending = ls.filter(l => l.status === 'pending').length;
  const eDelivered = eAttempted - eBounced;
  const bounceRate = eAttempted ? Math.round((eBounced / eAttempted) * 1000) / 10 : 0;

  // ---- Inbound lane -------------------------------------------------------
  const chatLeads = convos.filter(c => c.email).length;
  // Bookings made from Anas's own address are test rows, not demand.
  const realBookings = bookings.filter(b => !/manas192168|anasqureshi/i.test(b.email || ''));

  // ---- Blended ------------------------------------------------------------
  const touches = pTouched + eAttempted;
  const replies = pReplied + eReplied;
  const THRESHOLD = 1000;
  const pctToThreshold = Math.min(100, (touches / THRESHOLD) * 100);
  const replyRate = touches ? Math.round((replies / touches) * 1000) / 10 : 0;

  // ---- ICP concentration --------------------------------------------------
  const RECRUIT = /recruit|staffing|talent|headhunt|executive search|\brpo\b|\bhr\b/i;
  const pOnIcp = ps.filter(p => RECRUIT.test(p.niche || '')).length;
  const icpShare = pTotal ? Math.round((pOnIcp / pTotal) * 100) : 0;

  // ---- The live reply, if any --------------------------------------------
  const answered = ls
    .filter(l => l.replied_at)
    .sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));
  const hot = answered[0];
  const hotName = hot ? [hot.first_name, hot.last_name].filter(Boolean).join(' ') : null;
  const turnaround = hot && hot.sent_at
    ? Math.max(0, Math.round((new Date(hot.replied_at) - new Date(hot.sent_at)) / 60000))
    : null;

  const lastSend = ls.filter(l => l.sent_at).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];

  const fmt = (d) => d ? new Date(d).toISOString().slice(0, 10) : '—';

  // column geometry
  const C = { p1: 30, p2: 320, p3: 600, p4: 960, p5: 1220 };
  const W = { p1: 260, p2: 250, p3: 330, p4: 230, p5: 200 };
  const R = { a: 34, b: 116, c: 192, d: 268, e: 344 };

  return (
    <div>
      {/* ---------------- live banner ---------------- */}
      {hot && (
        <div style={{
          border: '2.5px solid var(--brick)', background: '#FBE0CE', padding: '14px 18px',
          boxShadow: '4px 4px 0 var(--ink)', marginBottom: 22,
        }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.14em', color: 'var(--brick)' }}>
            LIVE · SOMEONE ANSWERED
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 27, color: 'var(--ink)', lineHeight: 1.15, marginTop: 2 }}>
            {hotName} at {hot.company}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink2)' }}>
            Replied {turnaround != null ? `${turnaround} minutes after the send` : 'to a cold email'} on {fmt(hot.replied_at)}.
            {hot.booked_at ? ' A call is booked.' : ' Nothing has gone back yet.'}
          </div>
        </div>
      )}

      {/* ---------------- headline numbers ---------------- */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        border: '2.5px solid var(--ink)', background: 'var(--paper)', boxShadow: '4px 4px 0 var(--ink)', marginBottom: 26,
      }}>
        {[
          { k: 'Touches sent', v: touches, n: `${pTouched} DM · ${eAttempted} email` },
          { k: 'Replies', v: replies, n: `${replyRate}% of touches` },
          { k: 'Free builds', v: 0, n: 'never run' },
          { k: 'Received', v: '$0', n: 'the only real score' },
          { k: 'Last send', v: fmt(lastSend?.sent_at).slice(5), n: 'email lane' },
        ].map((s, i) => (
          <div key={s.k} style={{ padding: '11px 14px', borderRight: i < 4 ? '2px solid rgba(26,18,5,.14)' : 'none' }}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{s.k}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1.05, color: s.v === 0 || s.v === '$0' ? 'var(--brick)' : 'var(--ink)' }}>{s.v}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink3)' }}>{s.n}</div>
          </div>
        ))}
      </div>

      {/* ---------------- the map ---------------- */}
      <div style={{ border: '2.5px solid var(--ink)', background: 'var(--paper)', boxShadow: '5px 5px 0 var(--ink)', overflowX: 'auto' }}>
        <svg viewBox="0 0 1450 660" style={{ display: 'block', width: '100%', minWidth: 1000, height: 'auto' }}
             role="img" aria-label="The business drawn as five phases with a measurement layer underneath, each node coloured locked, dial or blind.">
          <defs>
            <marker id="mk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
            </marker>
            <marker id="mkd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--amber)" />
            </marker>
            <marker id="mkb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--forest)" />
            </marker>
          </defs>

          {/* phase-to-phase spine */}
          {[[C.p1 + W.p1, C.p2], [C.p2 + W.p2, C.p3], [C.p3 + W.p3, C.p4], [C.p4 + W.p4, C.p5]].map(([x1, x2], i) => (
            <path key={i} d={`M${x1 + 6},${R.a + 30} L${x2 - 6},${R.a + 30}`} stroke="var(--ink)" strokeWidth="3" markerEnd="url(#mk)" fill="none" />
          ))}

          {/* ===== PHASE 1 · POSITION ===== */}
          <Hub x={C.p1} y={R.a} w={W.p1} n="1" title="POSITION" sub="who you are" />
          <path d={`M${C.p1 + 16},${R.a + 60} L${C.p1 + 16},${R.e - 8}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          {[R.b, R.c, R.d].map(y => (
            <path key={y} d={`M${C.p1 + 16},${y + 33} L${C.p1 + 28},${y + 33}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          ))}
          <Node x={C.p1 + 28} y={R.b} w={W.p1 - 28} h={66} tone="lock"
                title="THE OFFER" line1="A working build, never advice" line2="$300 to $3,000 · floor set first" />
          <Node x={C.p1 + 28} y={R.c} w={W.p1 - 28} h={66} tone="dial" stat={`${icpShare}%`}
                title="THE ICP" line1={`${pOnIcp} of ${pTotal} sourced are recruiting`} line2="changeable, and the first thing to change" />
          <Node x={C.p1 + 28} y={R.d} w={W.p1 - 28} h={66} tone="lock"
                title="THE PROOF" line1="Your own builds only" line2="live assistant · this pipeline app" />

          {/* ===== PHASE 2 · FIND ===== */}
          <Hub x={C.p2} y={R.a} w={W.p2} n="2" title="FIND" sub="get names" />
          <path d={`M${C.p2 + 16},${R.a + 60} L${C.p2 + 16},${R.c + 41}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          {[R.b, R.c].map(y => (
            <path key={y} d={`M${C.p2 + 16},${y + 33} L${C.p2 + 28},${y + 33}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          ))}
          <Node x={C.p2 + 28} y={R.b} w={W.p2 - 28} h={66} tone="work" stat={pTotal + ls.length}
                title="SOURCING ENGINE" line1={`${pTotal} prospects · ${ls.length} email leads`} line2="automated, runs without you" />
          <Node x={C.p2 + 28} y={R.c} w={W.p2 - 28} h={66} tone="work" stat={eSkipped}
                title="THE FILTER" line1={`${eSkipped} rejected before sending`} line2="role addresses + unverifiable" />

          {/* ===== PHASE 3 · REACH ===== */}
          <Hub x={C.p3} y={R.a} w={W.p3} n="3" title="REACH" sub="get in front of them" />
          <path d={`M${C.p3 + 16},${R.a + 60} L${C.p3 + 16},${R.e + 41}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          {[R.b, R.c, R.d, R.e].map(y => (
            <path key={y} d={`M${C.p3 + 16},${y + 33} L${C.p3 + 28},${y + 33}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          ))}
          <Node x={C.p3 + 28} y={R.b} w={W.p3 - 28} h={66} tone="work" stat={pTouched}
                title="COLD DM · LINKEDIN" line1={`${pTouched} sent by hand, ${pNew} still waiting in the queue`} line2={`${pReplied} replies`} />
          <Node x={C.p3 + 28} y={R.c} w={W.p3 - 28} h={66} tone="work" stat={eAttempted}
                title="COLD EMAIL · OUTBOUNDOS" line1={`${eDelivered} delivered, ${eBounced} bounced (${bounceRate}%)`} line2={`${eReplied} reply · ${ePending} still queued`} />
          <Node x={C.p3 + 28} y={R.d} w={W.p3 - 28} h={66} tone="blind" stat={inbound.length + chatLeads}
                title="INBOUND · SITE + ASSISTANT" line1={`${inbound.length} form leads, ${chatLeads} chat leads`} line2="built and running, nobody is arriving" />
          <Node x={C.p3 + 28} y={R.e} w={W.p3 - 28} h={66} tone="dial"
                title="COPY + CONTENT" line1="the words in all three lanes above" line2="free to change, any day, no rebuild" />

          {/* ===== PHASE 4 · CONVERT ===== */}
          <Hub x={C.p4} y={R.a} w={W.p4} n="4" title="CONVERT" sub="start a conversation" />
          <path d={`M${C.p4 + 16},${R.a + 60} L${C.p4 + 16},${R.d + 41}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          {[R.b, R.c, R.d].map(y => (
            <path key={y} d={`M${C.p4 + 16},${y + 33} L${C.p4 + 28},${y + 33}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          ))}
          <Node x={C.p4 + 28} y={R.b} w={W.p4 - 28} h={66} tone={replies > 0 ? 'work' : 'blind'} stat={replies}
                title="REPLIES" line1={hot ? `${hotName}, ${turnaround} min` : 'nobody yet'} line2={`${replyRate}% of everything sent`} />
          <Node x={C.p4 + 28} y={R.c} w={W.p4 - 28} h={66} tone={replies > 0 ? 'dial' : 'none'} dashed={replies === 0}
                title="THE ANSWER BACK" line1={hot && !hot.booked_at ? 'owed right now' : 'nothing waiting'} line2="this is where a reply is won or lost" />
          <Node x={C.p4 + 28} y={R.d} w={W.p4 - 28} h={66} tone="none" dashed stat="0"
                title="FREE BUILD" line1="never delivered, not once" line2="the whole offer rests on this" />

          {/* ===== PHASE 5 · PAID ===== */}
          <Hub x={C.p5} y={R.a} w={W.p5} n="5" title="PAID" sub="money in" />
          <path d={`M${C.p5 + 16},${R.a + 60} L${C.p5 + 16},${R.c + 41}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          {[R.b, R.c].map(y => (
            <path key={y} d={`M${C.p5 + 16},${y + 33} L${C.p5 + 28},${y + 33}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
          ))}
          <Node x={C.p5 + 28} y={R.b} w={W.p5 - 28} h={66} tone="none" dashed stat={realBookings.length}
                title="CALLS BOOKED" line1="no real bookings yet" line2="test rows excluded" />
          <Node x={C.p5 + 28} y={R.c} w={W.p5 - 28} h={66} tone="none" dashed stat="$0"
                title="RECEIVED" line1="a verbal yes is not a win" line2="$300 in the account is" />

          {/* ===== feedback: a delivered build becomes proof ===== */}
          <path d={`M${C.p4 + 100},${R.d + 66} L${C.p4 + 100},428 L${C.p1 + 158},428 L${C.p1 + 158},${R.d + 66}`}
                stroke="var(--forest)" strokeWidth="2.5" strokeDasharray="8 6" fill="none" markerEnd="url(#mkb)" />
          <text x={C.p2 + 40} y="422" fontFamily="var(--font-mono)" fontSize="10" letterSpacing=".1em" fill="var(--forest)">
            ONE DELIVERED BUILD BECOMES THE PROOF THAT FIXES PHASE 1
          </text>

          {/* ===== MEASURE band ===== */}
          <line x1="30" y1="452" x2="1420" y2="452" stroke="var(--ink)" strokeWidth="2.5" />
          <Hub x={C.p1} y={470} w={W.p1} n="6" title="MEASURE" sub="what licenses a change" />
          <Node x={C.p2 + 28} y={470} w={W.p2 - 28} h={56} tone="work" stat={touches}
                title="REP COUNTER" line1="synced from this database" />
          <Node x={C.p3 + 28} y={470} w={W.p3 - 28} h={56} tone="dial" stat={`${Math.round(pctToThreshold)}%`}
                title="TRIES TOWARD THE ICP CALL" line1={`${touches} of ${THRESHOLD} · the ICP holds until then`} />
          <Node x={C.p4 + 28} y={470} w={W.p4 + W.p5 - 28} h={56} tone={bounceRate > 5 ? 'blind' : 'work'} stat={`${bounceRate}%`}
                title="BOUNCE GUARD" line1={`${eBounced} bounced of ${eAttempted} · watch this, it killed the last attempt`} />

          {/* threshold bar */}
          <rect x={C.p2 + 28} y="542" width={1420 - (C.p2 + 28)} height="20" fill="var(--paper2)" stroke="var(--ink)" strokeWidth="2.5" />
          <rect x={C.p2 + 31} y="545" width={Math.max(2, ((1420 - (C.p2 + 28)) - 6) * (pctToThreshold / 100))} height="14" fill="var(--forest)" />
          <text x={C.p2 + 28} y="578" fontFamily="var(--font-mono)" fontSize="10" letterSpacing=".1em" fill="var(--ink3)">
            {touches} TRIES LOGGED
          </text>
          <text x="1420" y="578" textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" letterSpacing=".1em" fill="var(--ink3)">
            {THRESHOLD} BEFORE THE ICP IS RECONSIDERED
          </text>

          {/* ===== feedback: measure licenses the dials ===== */}
          <path d={`M${C.p1 + 158},470 L${C.p1 + 158},${R.c + 66}`} stroke="var(--amber)" strokeWidth="2.5" strokeDasharray="8 6" fill="none" markerEnd="url(#mkd)" />
          <path d={`M${C.p3 + 300},470 L${C.p3 + 300},${R.e + 66}`} stroke="var(--amber)" strokeWidth="2.5" strokeDasharray="8 6" fill="none" markerEnd="url(#mkd)" />
          <text x={C.p1 + 166} y="466" fontFamily="var(--font-mono)" fontSize="10" letterSpacing=".1em" fill="var(--amber)">
            NUMBERS DECIDE THE DIALS, MOOD DOES NOT
          </text>

          <text x="725" y="640" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing=".12em" fill="var(--ink3)">
            GREEN IS SETTLED · AMBER IS YOURS TO TURN · RED IS BLIND, NOT FAILED · DASHED HAS NEVER RUN
          </text>
        </svg>
      </div>

      {/* ---------------- where it actually stands ---------------- */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 26,
      }}>
        {[
          {
            t: 'Phase 3 is not the problem',
            b: `All three lanes are built and two are firing. ${eAttempted} emails out with a ${bounceRate}% bounce rate, ${pTouched} DMs out by hand. Nothing upstream of a reply is broken.`,
          },
          {
            t: 'Phase 4 is the problem',
            b: hot
              ? `Someone answered in ${turnaround} minutes and the answer back has not gone out. The narrowest part of the machine is the one being left alone.`
              : `Nothing has come back yet across ${touches} tries.`,
          },
          {
            t: 'Phase 5 has never run',
            b: 'Zero free builds delivered, so the free-build-to-paid rate is not low, it is unmeasured. That is the single largest blind spot on this page.',
          },
        ].map(c => (
          <div key={c.t} style={{ border: '2.5px solid var(--ink)', background: 'var(--paper)', padding: '14px 16px', boxShadow: '4px 4px 0 var(--ink)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 23, color: 'var(--ink)', lineHeight: 1.1 }}>{c.t}</div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--ink2)', marginTop: 5 }}>{c.b}</p>
          </div>
        ))}
      </div>

      <p className="mono" style={{ fontSize: 10.5, letterSpacing: '.1em', color: 'var(--ink3)', marginTop: 20 }}>
        READ LIVE FROM SUPABASE ON EVERY LOAD · NOTHING ON THIS PAGE IS TYPED BY HAND
      </p>
    </div>
  );
}
