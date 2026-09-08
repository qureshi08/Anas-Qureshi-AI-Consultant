/**
 * Regenerates system/rep-counter.md from Supabase. The hand-logged version
 * drifted from reality every time (it undercounted one batch by 23, and
 * counted an out-of-office as a reply), so the file is now a rendered view of
 * the database rather than a thing anyone types into.
 *
 *   node scripts/rebuild-rep-counter.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../system/rep-counter.md');

const env = Object.fromEntries(
  fs.readFileSync(path.resolve(here, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

const THRESHOLD = 1000;
const SENT_STATES = ['sent', 'bounced', 'replied', 'booked'];
const DM_REPLIED = ['replied', 'call', 'won'];
const SENT_DATE = /\[(\d{4}-\d{2}-\d{2})\]/;

// Supabase caps a single select at 1,000 rows. The leads table passed that on
// 2026-09-08 and the counter silently dropped 30 touches, so every table is
// read in pages now.
async function all(table, columns) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
const [ps, ls, logs, was] = await Promise.all([
  all('prospects', 'status, notes, created_at'),
  all('leads', 'status, sent_at'),
  all('email_logs', 'status'),
  all('whatsapp_cold_leads', 'status, updated_at'),
]);

const pTouched = ps.filter(p => p.status !== 'new').length;
const pReplied = ps.filter(p => DM_REPLIED.includes(p.status)).length;
const eAttempted = ls.filter(l => SENT_STATES.includes(l.status)).length;
const eBounced = ls.filter(l => l.status === 'bounced').length;
const eReplied = ls.filter(l => ['replied', 'booked'].includes(l.status)).length;
const autoReplies = logs.filter(l => l.status === 'auto_reply').length;
// WhatsApp cold lane (added 2026-09-07). A row that left 'pending' was sent by hand
// from the phone; the table has no sent_at, so the day comes from updated_at,
// which is the moment Anas flipped the status on /admin/whatsapp-cold. A row
// marked dead before it was ever sent (filtered out on review) is not a touch.
const wa = was || [];
const wTouched = wa.filter(w => ['sent', 'replied', 'booked'].includes(w.status)).length;
const wReplied = wa.filter(w => ['replied', 'booked'].includes(w.status)).length;

const touches = pTouched + eAttempted + wTouched;
const replies = pReplied + eReplied + wReplied;

// Per-day counts. DM send dates live in each prospect's notes as [YYYY-MM-DD];
// fall back to created_at for the connect-request batches that never got a
// per-prospect note written. Email sends carry a real sent_at.
const byDay = {};
const bump = (day, lane) => {
  if (!day) return;
  byDay[day] = byDay[day] || { dm: 0, email: 0, wa: 0 };
  byDay[day][lane]++;
};
for (const p of ps) {
  if (p.status === 'new') continue;
  const m = SENT_DATE.exec(p.notes || '');
  bump(m ? m[1] : (p.created_at || '').slice(0, 10), 'dm');
}
for (const l of ls) if (l.sent_at) bump(l.sent_at.slice(0, 10), 'email');
for (const w of wa) if (['sent', 'replied', 'booked'].includes(w.status) && w.updated_at) bump(w.updated_at.slice(0, 10), 'wa');

const days = Object.keys(byDay).sort();
let running = 0;
const rows = days.map(d => {
  const { dm, email, wa } = byDay[d];
  running += dm + email + wa;
  const dow = new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `| ${d} | ${dow} | ${dm} | ${email} | ${wa} | ${dm + email + wa} | ${running} |`;
});

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const md = `# The Rep Counter

**Generated from Supabase on ${stamp} UTC. Do not hand-edit.**
Run \`node Website/scripts/rebuild-rep-counter.mjs\` to refresh. Every number below is
a query result, so this file cannot drift from the database the way the hand-logged
version did.

**A touch is a sent thing:** a connection request, a first DM, a follow-up DM, a reply
to inbound, a cold email that actually went out, or a cold WhatsApp message sent from the
phone and marked sent on /admin/whatsapp-cold. Sourcing a profile is not a touch.
Drafting is not a touch.

## Where it stands

| | |
|---|---|
| **Combined touches** | **${touches}** |
| Cold DM (LinkedIn) | ${pTouched} |
| Cold email (attempted) | ${eAttempted}, of which ${eBounced} bounced |
| Cold WhatsApp (sent by hand) | ${wTouched} |
| **Real replies** | **${replies}** (${touches ? (replies / touches * 100).toFixed(1) : 0}%) |
| Auto-replies (excluded) | ${autoReplies} |
| Progress to the ICP call | ${touches} / ${THRESHOLD} (${(touches / THRESHOLD * 100).toFixed(1)}%) |

An out-of-office is **not** a reply and is never counted as one. It is tracked
separately because it is the only hard evidence that a send reached a real monitored
mailbox rather than a spam folder.

**ICP-switch threshold, locked 2026-08-15: ${THRESHOLD} combined tries** before the
recruiting/staffing ICP is reconsidered. ${THRESHOLD - touches} to go.

## By day

| Date | Day | DM | Email | WhatsApp | Total | Running |
|---|---|---|---|---|---|---|
${rows.join('\n')}

---
*Regenerate this file rather than editing it. The live version of this same query is
the /admin/map page.*
`;

fs.writeFileSync(OUT, md);
console.log(`Wrote ${OUT}`);
console.log(`touches=${touches} dm=${pTouched} email=${eAttempted} replies=${replies} auto=${autoReplies}`);
