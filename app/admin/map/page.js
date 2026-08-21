import { createAdminClient } from '../../../lib/supabase/admin';
import { BENCH, ICP_NOTE, zeroCeiling, pZeroAtBenchmark } from './benchmarks';
import { PIVOT } from '../../../lib/era';
import MapView from './MapView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// The business drawn as the phases a stranger travels, not as a status list.
//
// The lock rule, per Anas 2026-08-15: a SYSTEM can be locked because it either
// runs or it doesn't. STRATEGY can only be locked by over-performing against an
// outside benchmark. So the offer, the price, the ICP and the positioning are
// never "locked" here no matter how settled they feel -- they are bets until
// the numbers beat the market.

const pct = (n, d) => (d ? (n / d) * 100 : 0);
const r1 = (n) => Math.round(n * 10) / 10;
const domainOf = (e) => ((e || '').split('@')[1] || '').toLowerCase();

// The ICP switched on PIVOT (recruiting/staffing -> marketing agencies, see
// goal.md 2026-08-21 and lib/era.js, the single source of truth). The default
// view shows only the current era so a fresh test is judged on its own numbers.
// Nothing is deleted -- ?era=recruiting and ?era=all show the full history, and
// the lifetime counter below always stays blended.
const ERAS = { current: 'current', recruiting: 'recruiting', all: 'all' };

export default async function MapPage({ searchParams }) {
  const era = ERAS[searchParams?.era] || 'current';
  const admin = createAdminClient();

  const [pRes, lRes, ibRes, cRes, bRes, logRes, campRes] = await Promise.all([
    admin.from('prospects').select('status, niche, source, notes, created_at'),
    admin.from('leads').select('id, email, status, sent_at, replied_at, booked_at, first_name, last_name, company, validation_status, current_step, created_at'),
    admin.from('inbound_leads').select('id'),
    admin.from('conversations').select('id, email'),
    admin.from('bookings').select('status, email'),
    admin.from('email_logs').select('lead_id, status, subject, body, sent_at'),
    admin.from('campaigns').select('id, name, subject_template'),
  ]);

  const allPs = pRes.data || [];
  const allLs = lRes.data || [];
  const inbound = ibRes.data || [];
  const convos = cRes.data || [];
  const bookings = bRes.data || [];
  const allLogs = logRes.data || [];
  const camps = campRes.data || [];

  // ---------------- era assignment ----------------
  // A prospect's era comes from its send date ([YYYY-MM-DD] tag in notes) when
  // touched, else its created_at. A lead's era comes from sent_at when sent,
  // else created_at. Rows dated before PIVOT are the recruiting era.
  const NOTE_DATE = /\[(\d{4}-\d{2}-\d{2})\]/;
  const pDate = (p) => {
    const m = NOTE_DATE.exec(p.notes || '');
    return m ? m[1] : (p.created_at || '').slice(0, 10);
  };
  const lDate = (l) => ((l.sent_at || l.created_at || '').slice(0, 10));
  const isCurrent = (d) => d >= PIVOT;
  const inEra = (d) => era === 'all' || (era === 'current' ? isCurrent(d) : !isCurrent(d));

  const ps = allPs.filter(p => inEra(pDate(p)));
  const ls = allLs.filter(l => inEra(lDate(l)));
  const lsIds = new Set(ls.map(l => l.id));
  const logs = allLogs.filter(l => lsIds.has(l.lead_id));

  // ---------------- lanes ----------------
  const DM_REPLIED = ['replied', 'call', 'won'];
  const SENT_STATES = ['sent', 'bounced', 'replied', 'booked'];

  const pTotal = ps.length;
  const pNew = ps.filter(p => p.status === 'new').length;
  const pTouched = pTotal - pNew;
  const pNoNote = ps.filter(p => p.status === 'request_sent_no_note').length;
  const pWithNote = ps.filter(p => p.status === 'request_sent_with_note').length;
  const pConnected = ps.filter(p => ['connected', 'dm_sent', 'dm_read', ...DM_REPLIED].includes(p.status)).length;
  const pDmSent = ps.filter(p => ['dm_sent', 'dm_read', ...DM_REPLIED].includes(p.status)).length;
  const pReplied = ps.filter(p => DM_REPLIED.includes(p.status)).length;
  const requestsOut = pNoNote + pWithNote + pConnected;

  const eAttempted = ls.filter(l => SENT_STATES.includes(l.status)).length;
  const eBounced = ls.filter(l => l.status === 'bounced').length;
  const eReplied = ls.filter(l => ['replied', 'booked'].includes(l.status)).length;
  const eSkippedRole = ls.filter(l => l.status === 'skipped_role_address').length;
  const eSkippedUnver = ls.filter(l => l.status === 'skipped_unverified').length;
  const ePending = ls.filter(l => l.status === 'pending').length;
  const eDelivered = eAttempted - eBounced;
  const bounceRate = r1(pct(eBounced, eAttempted));

  const autoLogs = logs.filter(l => l.status === 'auto_reply');
  const autoReplies = autoLogs.length;
  const leadById = new Map(ls.map(l => [l.id, l]));

  const chatLeads = convos.filter(c => c.email).length;
  const realBookings = bookings.filter(b => !/manas192168|anasqureshi/i.test(b.email || ''));

  const touches = pTouched + eAttempted;
  const replies = pReplied + eReplied;
  const replyRate = r1(pct(replies, touches));
  const THRESHOLD = 1000;

  // Lifetime blended total across every era. The 1,000-try counter deliberately
  // never resets at an ICP switch, so it is always computed from the unfiltered
  // data regardless of which era view is active.
  const lifeTouches =
    allPs.filter(p => p.status !== 'new').length +
    allLs.filter(l => SENT_STATES.includes(l.status)).length;

  // ---------------- benchmark verdicts ----------------
  const emailCeiling = zeroCeiling(eAttempted);
  const emailPZero = pZeroAtBenchmark(eAttempted, BENCH.emailReply.avg);
  const dmCeiling = zeroCeiling(pDmSent);

  const emailCopyVerdict = eReplied > 0
    ? (pct(eReplied, eAttempted) >= BENCH.emailReply.good ? 'over' : pct(eReplied, eAttempted) >= BENCH.emailReply.avg ? 'at' : 'under')
    : (emailCeiling !== null && emailCeiling < BENCH.emailReply.avg ? 'under' : 'bet');

  const dmCopyVerdict = pReplied > 0
    ? (pct(pReplied, pDmSent) >= BENCH.liReply.avg ? 'over' : 'at')
    : (dmCeiling !== null && dmCeiling < BENCH.liReply.avg ? 'under' : 'bet');

  const bounceVerdict = eAttempted === 0 ? 'bet'
    : bounceRate <= BENCH.emailBounce.good ? 'over'
    : bounceRate <= BENCH.emailBounce.avg ? 'at' : 'under';

  // Connection notes: the free-account note cap means most requests went out
  // bare, and bare requests are the single biggest documented acceptance drag.
  const noteVerdict = requestsOut === 0 ? 'bet' : (pct(pWithNote, requestsOut) < 50 ? 'under' : 'at');

  // ---------------- breakdowns for the drill-downs ----------------
  const tally = (arr, key) => {
    const t = {};
    for (const x of arr) { const k = key(x) || '(none)'; t[k] = (t[k] || 0) + 1; }
    return Object.entries(t).sort((a, b) => b[1] - a[1]);
  };

  const sourceRows = tally(ps, p => p.source);
  const validationRows = tally(ls, l => l.validation_status);
  const bouncedDomains = tally(ls.filter(l => l.status === 'bounced'), l => domainOf(l.email));
  // ICP switched 2026-08-21: recruiting/staffing retired, marketing/digital agencies is current.
  // The on-target test matches the era being viewed, so the historical view still
  // grades old prospects against the ICP they were actually sourced for.
  const MARKETING_RE = /marketing agenc|digital agenc|creative agenc|ad agenc/i;
  const RECRUIT_RE = /recruit|staffing|talent|headhunt|executive search|\brpo\b|\bhr\b/i;
  const ICP_RE = era === 'recruiting' ? RECRUIT_RE : MARKETING_RE;
  const onIcp = ps.filter(p => ICP_RE.test(p.niche || '')).length;
  const offIcp = ps.filter(p => p.niche && !ICP_RE.test(p.niche)).map(p => p.niche);
  const icpShare = Math.round(pct(onIcp, pTotal));

  // sends per day, both lanes
  const SENT_DATE = /\[(\d{4}-\d{2}-\d{2})\]/;
  const byDay = {};
  const bump = (d, lane) => { if (!d) return; byDay[d] = byDay[d] || { dm: 0, email: 0 }; byDay[d][lane]++; };
  for (const p of ps) {
    if (p.status === 'new') continue;
    const m = SENT_DATE.exec(p.notes || '');
    bump(m ? m[1] : (p.created_at || '').slice(0, 10), 'dm');
  }
  for (const l of ls) if (l.sent_at) bump(l.sent_at.slice(0, 10), 'email');
  const dayRows = Object.keys(byDay).sort().map(d => [d, `${byDay[d].dm} DM · ${byDay[d].email} email`]);
  const sendingDays = Object.keys(byDay).length;

  const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');
  const lastSend = ls.filter(l => l.sent_at).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];

  const hot = ls
    .filter(l => l.replied_at && ['replied', 'booked'].includes(l.status))
    .sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at))[0];

  // ---------------- the model handed to the view ----------------
  const N = (id, o) => ({ id, ...o });

  const nodes = [
    // ---- PHASE 1 · POSITION (all strategy: never lockable without proof) ----
    N('offer', {
      phase: 1, row: 0, title: 'THE OFFER', stat: '0',
      verdict: 'bet', sub: 'one free build, then paid',
      why: 'Strategy, so it cannot be locked. It has also never run once.',
      detail: {
        headline: 'Zero free builds delivered to a direct prospect. Ever.',
        bench: 'No benchmark applies until it has run once.',
        bullets: [
          'The entire offer design rests on free build converting to paid, and that rate is not low, it is unmeasured.',
          'The nearest evidence is a concrete build with a price attached getting a same-day yes. That is one data point, and it came through a warm channel.',
          'This is the cheapest unknown on the whole page to close: it takes one delivery, not a hundred more sends.',
        ],
        rows: [['Free builds delivered', '0'], ['Paid clients', '0'], ['Money received', '$0']],
      },
    }),
    N('price', {
      phase: 1, row: 1, title: 'THE PRICE', stat: '$300+',
      verdict: 'bet', sub: '$300 to $3,000 menu',
      why: 'Strategy. Never tested against a real buyer.',
      detail: {
        headline: 'The menu has never been quoted to a direct client and accepted.',
        bench: 'No benchmark until someone is quoted.',
        bullets: [
          'Automation $300 to $1,000, assistant $500 to $1,500, internal tool $1,000 to $3,000.',
          'The one live negotiation ended below the opening quote, which is why floor terms now get written down before any call.',
          'Delivery cost is near zero, so almost the entire price is margin. That is the part that is genuinely settled.',
        ],
        rows: [['Quotes given', '0'], ['Accepted', '0']],
      },
    }),
    N('icp', {
      phase: 1, row: 2, title: 'THE ICP', stat: `${icpShare}%`,
      verdict: 'bet', sub: 'marketing/digital agencies (switched 2026-08-21)',
      why: 'Strategy. Recruiting/staffing retired, this is a fresh, unvalidated test.',
      detail: {
        headline: `${onIcp} of ${pTotal} sourced prospects are genuinely in the marketing/digital-agency vertical.`,
        bench: ICP_NOTE,
        bullets: [
          'Recruiting/staffing was retired 2026-08-21 at 518+ combined touches, before the 1,000-try threshold, by a deliberate documented decision: 3 real replies, all negative, two rejecting the specific AI-screening feature. Full reasoning in goal.md.',
          'This vertical has no track record here yet, on-ICP share reflects sourcing since the switch, prospects still tagged recruiting/staffing now correctly show as off-ICP.',
          'The 1,000-try discipline still applies going forward: this ICP is not switched again on a whim, only by another deliberate documented call.',
        ],
        rows: [
          ['On-ICP prospects', `${onIcp} (${icpShare}%)`],
          ['Off-ICP still on the list', String(offIcp.length)],
          ...offIcp.slice(0, 6).map(n => ['  off-ICP', n]),
        ],
      },
    }),
    N('proofrule', {
      phase: 1, row: 3, title: 'PROOF RULE', stat: '🔒',
      verdict: 'locked', sub: 'own builds only, never the employer',
      why: 'A constraint, not a strategy. Constraints lock.',
      detail: {
        headline: 'Never name or use employer client work as personal proof.',
        bench: 'Not a performance question. This one is a hard boundary.',
        bullets: [
          'This is the one thing on the page that is locked regardless of how it performs, because it is a rule rather than a tactic.',
          'Usable proof: the live assistant, this pipeline app, the outbound engine. All built by you, all showable.',
          'It came from a real takedown order, so it is not theoretical.',
        ],
        rows: [['Status', 'Permanent'], ['Reason', 'Boundary, not tactic']],
      },
    }),

    // ---- PHASE 2 · FIND (systems: lockable) ----
    N('sourcing', {
      phase: 2, row: 0, title: 'SOURCING ENGINE', stat: String(pTotal + ls.length),
      verdict: 'locked', sub: 'automated, runs without you',
      why: 'A mechanism that reliably produces on-target rows. Systems lock.',
      detail: {
        headline: `${pTotal} prospects and ${ls.length} email leads found, ${icpShare}% on target.`,
        bench: 'Judged on whether it runs and hits the brief. It does both.',
        bullets: [
          'Replaced manual batch sessions and paid people-search tools entirely, at zero cost.',
          'One run feeds both outbound lanes from the same pass.',
          'This is the clearest example on the page of something that has genuinely earned a lock.',
        ],
        rows: sourceRows.map(([k, v]) => [k, String(v)]),
      },
    }),
    N('filter', {
      phase: 2, row: 1, title: 'THE FILTER', stat: String(eSkippedRole + eSkippedUnver),
      verdict: 'locked', sub: 'kills bad addresses before sending',
      why: 'A mechanism, doing measurable work.',
      detail: {
        headline: `${eSkippedRole + eSkippedUnver} leads rejected before a single send.`,
        bench: `Bounce rate benchmark: ${BENCH.emailBounce.avg}% average, under ${BENCH.emailBounce.good}% is good.`,
        bullets: [
          `${eSkippedRole} role addresses (info@, sales@) excluded automatically. Those were confirmed as a real bounce source, not a theory.`,
          `${eSkippedUnver} excluded as unverifiable.`,
          'This filter is the direct reason the bounce rate is survivable rather than catastrophic.',
        ],
        rows: [
          ['Skipped, role address', String(eSkippedRole)],
          ['Skipped, unverified', String(eSkippedUnver)],
          ...validationRows.map(([k, v]) => [`Validation: ${k}`, String(v)]),
        ],
      },
    }),

    // ---- PHASE 3 · REACH ----
    N('dm', {
      phase: 3, row: 0, title: 'COLD DM · SYSTEM', stat: String(pTouched),
      verdict: 'working', sub: 'hand-sent, fully logged',
      why: 'The mechanism works. What it carries is judged separately.',
      detail: {
        headline: `${pTouched} touches out by hand, ${pNew} still queued.`,
        bench: `LinkedIn acceptance benchmark ${BENCH.liAccept.avg}% average.`,
        bullets: [
          'Every send is logged with a date, which is why the counter can now be rebuilt from the database.',
          `${pConnected} prospects have been marked connected. If people have accepted without the status being updated, acceptance is invisible and that is a tracking gap worth closing.`,
          'Sending is manual by design. Automated LinkedIn interaction is the thing that gets accounts restricted.',
        ],
        rows: [
          ['Sourced, not yet touched', String(pNew)],
          ['Requests sent, no note', String(pNoNote)],
          ['Requests sent, with note', String(pWithNote)],
          ['Connected', String(pConnected)],
          ['DMs sent', String(pDmSent)],
          ['Replies', String(pReplied)],
        ],
      },
    }),
    N('notes', {
      phase: 3, row: 1, title: 'CONNECTION NOTES', stat: `${pWithNote}/${requestsOut || 0}`,
      verdict: noteVerdict, sub: 'the cheapest fix on this page',
      why: 'Measurably below the benchmark, and the cause is known.',
      detail: {
        headline: `${pNoNote} connection requests went out with no note, and ${pConnected} have been marked accepted.`,
        bench: `Personalized requests run about ${BENCH.liAccept.personalized}% acceptance against roughly ${BENCH.liAccept.generic}% for bare ones. A note also lifts post-acceptance reply from about 5.4% to 9.4%.`,
        bullets: [
          'The cause is the free-account cap on personalized invites, not discipline.',
          `Even against the bare-request benchmark this is low: ${BENCH.liAccept.generic}% of ${pNoNote} would be about ${Math.round(pNoNote * BENCH.liAccept.generic / 100)} acceptances. Most of these went out within the last few days though, and invites often sit for a week or two, so it is early rather than conclusive.`,
          'Correction worth knowing: Premium does NOT raise the connection-request limit. Free and paid are both capped around 100 invites a week. Premium buys notes, InMail and Open Profile messaging, not more invites.',
          'Free lever to test first: prospects with Open Profile enabled can be messaged with no connection and no InMail credit. Recruiters skew heavily to Premium accounts, so this ICP should have an above-average share of them.',
          'Sequencing matters. The copy is already measurably below benchmark on the email lane, so paying for more reach would buy more silence. Fix the message where testing is free, then buy distribution.',
        ],
        rows: [
          ['Requests with a note', String(pWithNote)],
          ['Requests with no note', String(pNoNote)],
          ['Marked accepted', String(pConnected)],
          ['Benchmark, personalized', `${BENCH.liAccept.personalized}%`],
          ['Benchmark, generic', `${BENCH.liAccept.generic}%`],
          ['Invite cap, free', '~100/week'],
          ['Invite cap, Premium', '~100/week (same)'],
        ],
      },
    }),
    N('email', {
      phase: 3, row: 2, title: 'COLD EMAIL · SYSTEM', stat: String(eAttempted),
      verdict: 'locked', sub: 'validator, bounce guard, sequencer',
      why: 'A mechanism that runs correctly. The copy it carries is judged separately.',
      detail: {
        headline: `${eDelivered} delivered, ${eBounced} bounced, ${ePending} still queued.`,
        bench: `Bounce ${bounceRate}% against a ${BENCH.emailBounce.avg}% average and a ${BENCH.emailBounce.good}% "good list" line.`,
        bullets: [
          'This lane already died once at 637 sends with no proof, an unwarmed sender and a blacklisted IP. The rebuild added validation, bounce detection and role-address exclusion specifically to stop that repeating.',
          `Currently sending through connected Gmail accounts rather than a dedicated warmed domain. That is the one part of the old failure still present.`,
          `Campaign: ${camps[0]?.name || 'none'}.`,
        ],
        rows: [
          ['Attempted', String(eAttempted)],
          ['Delivered', String(eDelivered)],
          ['Bounced', `${eBounced} (${bounceRate}%)`],
          ['Pending', String(ePending)],
          ...dayRows.map(([d, v]) => [d, v]),
        ],
      },
    }),
    N('copy', {
      phase: 3, row: 3, title: 'THE COPY', stat: `${replyRate}%`,
      verdict: emailCopyVerdict, sub: 'the words, in both lanes',
      why: eAttempted >= 100
        ? 'Strategy, and this one now has enough volume to judge.'
        : 'Strategy. Not enough volume in this era yet to judge.',
      detail: {
        headline: `${replies} real replies from ${touches} tries.`,
        bench: `Benchmark reply rate is ${BENCH.emailReply.avg}% average, ${BENCH.emailReply.good}% solid, ${BENCH.emailReply.strong}%+ strong.`,
        bullets: [
          emailPZero !== null
            ? `If the copy performed at the ${BENCH.emailReply.avg}% average, the chance of seeing zero replies across ${eAttempted} emails is about ${(emailPZero * 100).toFixed(1)}%. This is not a small-sample problem any more.`
            : 'Not enough sends yet to judge.',
          emailCeiling !== null
            ? `With 95% confidence the true email reply rate is below ${r1(emailCeiling)}%, against a ${BENCH.emailReply.avg}% benchmark.`
            : '',
          `On LinkedIn only ${pDmSent} actual messages have gone out, so ${dmCeiling !== null ? `the ceiling there is a looser ${r1(dmCeiling)}%` : 'there is not enough volume yet'}. The DM lane is not yet judged, the email lane is.`,
          'The prior ICP (recruiting/staffing) was retired 2026-08-21 after its own message-vs-audience read: replies specifically rejected the AI-screening feature, not just went silent. On the current ICP (marketing/digital agencies), judge copy fresh, this history is not a benchmark for the new vertical.',
        ].filter(Boolean),
        rows: [
          ['Email attempted', String(eAttempted)],
          ['Email replies', String(eReplied)],
          ['DMs actually sent', String(pDmSent)],
          ['DM replies', String(pReplied)],
          ['Benchmark average', `${BENCH.emailReply.avg}%`],
        ],
      },
    }),
    N('inbound', {
      phase: 3, row: 4, title: 'INBOUND · SITE', stat: String(inbound.length + chatLeads),
      verdict: inbound.length + chatLeads > 0 ? 'working' : 'none',
      sub: 'built, running, nobody arriving',
      why: 'The system works. It has never been given traffic.',
      detail: {
        headline: `${inbound.length} form leads and ${chatLeads} chat leads, all time.`,
        bench: 'No benchmark applies to a page with no visitors.',
        bullets: [
          'The landing page, the live assistant and the capture pipeline are all built and functioning.',
          'A perfect page multiplied by near-zero traffic is near zero. The bottleneck is upstream of the page, so improving the page cannot fix it.',
          'Content is the intended traffic source, and it has been posting intermittently at best.',
        ],
        rows: [['Form leads', String(inbound.length)], ['Chat leads', String(chatLeads)], ['Real call requests', String(realBookings.length)]],
      },
    }),

    // ---- PHASE 4 · CONVERT ----
    N('replies', {
      phase: 4, row: 0, title: 'REAL REPLIES', stat: String(replies),
      verdict: replies > 0 ? 'at' : 'under', sub: 'humans, not machines',
      why: 'Below benchmark with enough volume for that to mean something.',
      detail: {
        headline: `${replies} genuine replies across ${touches} tries.`,
        bench: `${BENCH.emailReply.avg}% would have produced about ${Math.round(eAttempted * BENCH.emailReply.avg / 100)} replies from the email lane alone.`,
        bullets: [
          'The out-of-office that was previously counted here has been removed. A machine acknowledging receipt is not interest.',
          'The scanner now excludes auto-responders by header and by subject, so this number stays honest without anyone policing it.',
          hot ? `Live: ${[hot.first_name, hot.last_name].filter(Boolean).join(' ')} at ${hot.company}.` : 'No human has answered yet.',
        ],
        rows: [['DM replies', String(pReplied)], ['Email replies', String(eReplied)], ['Auto-replies, excluded', String(autoReplies)]],
      },
    }),
    N('auto', {
      phase: 4, row: 1, title: 'AUTO-REPLIES', stat: String(autoReplies),
      verdict: autoReplies > 0 ? 'working' : 'none', sub: 'proof of delivery, not interest',
      why: 'The only hard evidence mail reaches a real inbox.',
      detail: {
        headline: autoReplies > 0
          ? `${autoReplies} auto-reply, which confirms at least one send reached a monitored human mailbox.`
          : 'No auto-replies yet, so delivery to a human inbox is still unconfirmed.',
        bench: 'Not a performance metric. It is a delivery probe.',
        bullets: [
          'This splits a question that used to be unanswerable: a message problem and a delivery problem look identical until something proves the mail arrives.',
          'It arrived, was opened by a mail client, and triggered a response. That points the finger at the message.',
          ...autoLogs.map(l => {
            const lead = leadById.get(l.lead_id);
            return `${lead?.company || 'unknown'} — ${l.subject}`;
          }),
        ],
        rows: autoLogs.map(l => {
          const lead = leadById.get(l.lead_id);
          return [lead?.company || 'unknown', fmt(l.sent_at)];
        }),
      },
    }),
    N('freebuild', {
      phase: 4, row: 2, title: 'FREE BUILD', stat: '0',
      verdict: 'none', sub: 'never delivered, not once',
      why: 'No data of any kind exists.',
      detail: {
        headline: 'The single largest blind spot on this page.',
        bench: 'Nothing to compare against.',
        bullets: [
          'Every number upstream is an argument about how to reach this step. Nothing downstream can be judged until it runs once.',
          'It does not need a reply to happen. A build could be made speculatively for a named prospect and sent cold as the opener.',
          'That would also convert into the proof that Phase 1 is missing.',
        ],
        rows: [['Delivered', '0'], ['Converted to paid', 'unmeasured']],
      },
    }),

    // ---- PHASE 5 · PAID ----
    N('paid', {
      phase: 5, row: 0, title: 'RECEIVED', stat: '$0',
      verdict: 'none', sub: 'the only real score',
      why: 'Never run.',
      detail: {
        headline: '$0 received. One direct client at $300 is the win condition.',
        bench: 'A verbal yes is not a win, agreed terms are not a win, money in is a win.',
        bullets: [
          `${realBookings.length} real call requests. The two rows in the bookings table are your own test entries and are excluded.`,
          'One retainer replaces the job. The funnel does not need to be big, it needs to be worked.',
        ],
        rows: [['Received', '$0'], ['Real call requests', String(realBookings.length)]],
      },
    }),

    // ---- PHASE 6 · MEASURE (systems) ----
    N('counter', {
      phase: 6, row: 0, title: 'THE COUNTER', stat: String(touches),
      verdict: 'locked', sub: 'generated, never typed',
      why: 'A mechanism, and it now cannot drift.',
      detail: {
        headline: `${touches} touches, rebuilt from the database on demand.`,
        bench: 'Judged on whether it can lie. It no longer can.',
        bullets: [
          'The hand-written version had understated the total by 68 and had undercounted one day by 23.',
          'Run node Website/scripts/rebuild-rep-counter.mjs to refresh the markdown. This page is the live version of the same queries.',
          `Sending has happened on ${sendingDays} distinct days.`,
        ],
        rows: dayRows,
      },
    }),
    N('threshold', {
      phase: 6, row: 1, title: 'THE ICP THRESHOLD', stat: `${Math.round(pct(lifeTouches, THRESHOLD))}%`,
      verdict: 'locked', sub: `${lifeTouches} of ${THRESHOLD} tries (lifetime, blended)`,
      why: 'A decision rule. Rules lock, but a documented override is not the same as ignoring one.',
      detail: {
        headline: `2026-08-21: recruiting/staffing was retired at 518 touches, before this threshold, by deliberate decision, not drift.`,
        bench: 'Exists so a decision cannot be made by mood, not to force volume past the point the signal is already clear.',
        bullets: [
          'Message-level changes are deliberately NOT gated by this. Copy can change today, and on the evidence it should.',
          'This counter is the lifetime blended total across every ICP ever tried, it does not reset at a switch or change with the era filter. The current ICP (marketing/digital agencies) is held to the same discipline: not switched again without an equally deliberate, documented call.',
          'Full reasoning for the 2026-08-21 override: goal.md and failure-archaeology.',
        ],
        rows: [['Tries logged (lifetime)', String(lifeTouches)], ['Threshold', String(THRESHOLD)], ['Remaining', String(Math.max(0, THRESHOLD - lifeTouches))]],
      },
    }),
    N('bounce', {
      phase: 6, row: 2, title: 'BOUNCE GUARD', stat: `${bounceRate}%`,
      verdict: bounceVerdict, sub: 'the thing that killed the last attempt',
      why: 'Measured against the market, not against a feeling.',
      detail: {
        headline: `${eBounced} bounces from ${eAttempted} attempts.`,
        bench: `Average is ${BENCH.emailBounce.avg}%. A well-maintained list stays under ${BENCH.emailBounce.good}%, the best under ${BENCH.emailBounce.best}%.`,
        bullets: [
          bounceRate <= BENCH.emailBounce.avg
            ? `At ${bounceRate}% this is inside the average band, so it is not an emergency.`
            : `At ${bounceRate}% this is above the average band and needs attention now.`,
          `It is still roughly ${r1(bounceRate / BENCH.emailBounce.good)}x the "good list" line, and reputation damage compounds quietly before it shows up as a block.`,
          'Almost every lead validates as RISKY rather than SAFE, because mailbox existence cannot be confirmed from a serverless host with port 25 blocked. That is a known limitation, not a data problem.',
        ],
        rows: bouncedDomains.map(([k, v]) => [k, String(v)]),
      },
    }),
  ];

  const summary = {
    touches, replies, replyRate, autoReplies, pTouched, eAttempted, eBounced, bounceRate,
    pNew, pNoNote, pDmSent, icpShare, threshold: THRESHOLD,
    lastSend: fmt(lastSend?.sent_at),
    emailCeiling: emailCeiling !== null ? r1(emailCeiling) : null,
    emailPZero: emailPZero !== null ? r1(emailPZero * 100) : null,
    benchReply: BENCH.emailReply.avg,
    expectedReplies: Math.round(eAttempted * BENCH.emailReply.avg / 100),
    era, pivot: PIVOT, lifeTouches,
  };

  return <MapView nodes={nodes} summary={summary} />;
}
