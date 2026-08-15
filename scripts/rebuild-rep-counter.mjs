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

const [{ data: ps }, { data: ls }, { data: logs }] = await Promise.all([
  db.from('prospects').select('status, notes, created_at'),
  db.from('leads').select('status, sent_at'),
  db.from('email_logs').select('status'),
]);

const pTouched = ps.filter(p => p.status !== 'new').length;
const pReplied = ps.filter(p => DM_REPLIED.includes(p.status)).length;
const eAttempted = ls.filter(l => SENT_STATES.includes(l.status)).length;
const eBounced = ls.filter(l => l.status === 'bounced').length;
const eReplied = ls.filter(l => ['replied', 'booked'].includes(l.status)).length;
const autoReplies = logs.filter(l => l.status === 'auto_reply').length;

const touches = pTouched + eAttempted;
const replies = pReplied + eReplied;

// Per-day counts. DM send dates live in each prospect's notes as [YYYY-MM-DD];
// fall back to created_at for the connect-request batches that never got a
// per-prospect note written. Email sends carry a real sent_at.
const byDay = {};
const bump = (day, lane) => {
  if (!day) return;
  byDay[day] = byDay[day] || { dm: 0, email: 0 };
  byDay[day][lane]++;
};
for (const p of ps) {
  if (p.status === 'new') continue;
  const m = SENT_DATE.exec(p.notes || '');
  bump(m ? m[1] : (p.created_at || '').slice(0, 10), 'dm');
}
for (const l of ls) if (l.sent_at) bump(l.sent_at.slice(0, 10), 'email');

const days = Object.keys(byDay).sort();
let running = 0;
const rows = days.map(d => {
  const { dm, email } = byDay[d];
  running += dm + email;
  const dow = new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `| ${d} | ${dow} | ${dm} | ${email} | ${dm + email} | ${running} |`;
});

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const md = `# The Rep Counter

**Generated from Supabase on ${stamp} UTC. Do not hand-edit.**
Run \`node Website/scripts/rebuild-rep-counter.mjs\` to refresh. Every number below is
a query result, so this file cannot drift from the database the way the hand-logged
version did.

**A touch is a sent thing:** a connection request, a first DM, a follow-up DM, a reply
to inbound, or a cold email that actually went out. Sourcing a profile is not a touch.
Drafting is not a touch.

## Where it stands

| | |
|---|---|
| **Combined touches** | **${touches}** |
| Cold DM (LinkedIn) | ${pTouched} |
| Cold email (attempted) | ${eAttempted}, of which ${eBounced} bounced |
| **Real replies** | **${replies}** (${touches ? (replies / touches * 100).toFixed(1) : 0}%) |
| Auto-replies (excluded) | ${autoReplies} |
| Progress to the ICP call | ${touches} / ${THRESHOLD} (${(touches / THRESHOLD * 100).toFixed(1)}%) |

An out-of-office is **not** a reply and is never counted as one. It is tracked
separately because it is the only hard evidence that a send reached a real monitored
mailbox rather than a spam folder.

**ICP-switch threshold, locked 2026-08-15: ${THRESHOLD} combined tries** before the
recruiting/staffing ICP is reconsidered. ${THRESHOLD - touches} to go.

## By day

| Date | Day | DM | Email | Total | Running |
|---|---|---|---|---|---|
${rows.join('\n')}

---
*Regenerate this file rather than editing it. The live version of this same query is
the /admin/map page.*
`;

fs.writeFileSync(OUT, md);
console.log(`Wrote ${OUT}`);
console.log(`touches=${touches} dm=${pTouched} email=${eAttempted} replies=${replies} auto=${autoReplies}`);
