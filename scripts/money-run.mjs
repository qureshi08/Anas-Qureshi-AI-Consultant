/**
 * MONEY RUN: prints everything that is ready to send today, from the database, so Claude can hand
 * it to Anas in the chat as copy paste blocks (rule locked 2026-11-16, memory
 * feedback_everything_in_chat.md, skill .claude/skills/money-run/SKILL.md).
 *
 *   node Website/scripts/money-run.mjs            all sections
 *   node Website/scripts/money-run.mjs --lane Remote
 *
 * Read only. Sections: written job applications by lane (Remote, Gulf, Startups), open rows that
 * still need writing, plan contacts due a follow up, connection requests waiting.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, '..', '.env.local');
for (const l of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
const laneArg = (process.argv.find(a => a.startsWith('--lane=')) || '').split('=')[1] || (process.argv.includes('--lane') ? process.argv[process.argv.indexOf('--lane') + 1] : null);
const today = new Date().toISOString().slice(0, 10);
const daysAgo = d => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);

const { data: jobs, error } = await db.from('job_leads')
  .select('id, lane, title, company, location, url, score, salary_label, posted_at, status, cover_note, answers, email_subject, email_body, contact_email, contact_name, applied_at, notes')
  .in('status', ['new', 'shortlisted']).order('score', { ascending: false }).limit(500);
if (error) { console.log('DB ERROR', error.message); process.exit(1); }

const lanes = laneArg ? [laneArg] : ['Remote', 'Gulf', 'Startups'];
const isGulf = j => !['Training', 'Startups', 'Remote'].includes(j.lane);
const inLane = (j, l) => (l === 'Gulf' ? isGulf(j) : j.lane === l);

const { data: applied } = await db.from('job_leads').select('lane, applied_at').gte('applied_at', today);
console.log(`# MONEY RUN ${today}`);
console.log(`Applied today: ${(applied || []).length}`);

for (const l of lanes) {
  const open = (jobs || []).filter(j => inLane(j, l));
  const ready = open.filter(j => j.cover_note || j.email_body);
  console.log(`\n## LANE ${l}: ${open.length} open, ${ready.length} written`);
  for (const j of ready.slice(0, 15)) {
    console.log(`\n### [${j.id}] ${j.title} | ${j.company} | ${j.location} | score ${j.score} | ${j.salary_label} | posted ${daysAgo(j.posted_at) ?? '?'}d ago`);
    console.log(`URL: ${j.url}`);
    if (j.contact_email) console.log(`EMAIL TO: ${j.contact_email}${j.contact_name ? ' (' + j.contact_name + ')' : ''}`);
    if (j.email_subject) console.log(`SUBJECT: ${j.email_subject}`);
    if (j.email_body) console.log(`EMAIL BODY:\n${j.email_body}`);
    if (j.cover_note) console.log(`COVER NOTE:\n${j.cover_note}`);
    let ans = j.answers;
    if (typeof ans === 'string') { try { ans = JSON.parse(ans); } catch { ans = null; } }
    if (Array.isArray(ans) && ans.length) for (const a of ans) console.log(`Q: ${a.q}\nA: ${a.a}`);
    const fit = (j.notes || '').split('\n').find(x => /(Fit|Stretch|Mismatch):/.test(x));
    if (fit) console.log(`FIT: ${fit.replace(/^\[[^\]]*\]\s*/, '')}`);
  }
  const todo = open.filter(j => !(j.cover_note || j.email_body));
  if (todo.length) {
    console.log(`\n-- ${l}: not written yet (top 10) --`);
    for (const j of todo.slice(0, 10)) console.log(`[${j.id}] ${j.title} | ${j.company} | ${j.location} | score ${j.score} | ${j.url}${j.contact_email ? ' | email ' + j.contact_email : ''}`);
  }
}

if (!laneArg) {
  const { data: contacts } = await db.from('job_plan_contacts').select('*').order('contacted_on', { ascending: true });
  const due = (contacts || []).filter(c => c.contacted_on && !c.replied_on && !c.followed_up_on && daysAgo(c.contacted_on) >= 4);
  const replied = (contacts || []).filter(c => c.replied_on && !c.referral_on && !c.call_on);
  console.log(`\n## PEOPLE: ${(contacts || []).length} contacts, ${due.length} due a follow up, ${replied.length} replied and waiting on you`);
  for (const c of replied) console.log(`REPLIED [${c.id}] ${c.name} | ${c.company} | replied ${c.replied_on} | ${c.link}\n  notes: ${(c.notes || '').slice(0, 300)}`);
  for (const c of due.slice(0, 10)) console.log(`FOLLOW UP [${c.id}] ${c.name} | ${c.company} | contacted ${c.contacted_on} (${daysAgo(c.contacted_on)}d) | ${c.link}\n  notes: ${(c.notes || '').slice(0, 300)}`);
  const { data: sugg } = await db.from('job_plan_suggestions').select('*').order('created_at', { ascending: false }).limit(200);
  const waiting = (sugg || []).filter(s => s.status === 'requested');
  const fresh = (sugg || []).filter(s => !s.status || s.status === 'new' || s.status === 'suggested');
  console.log(`\n## CONNECTIONS: ${waiting.length} requests sent and waiting, ${fresh.length} suggested people not yet requested`);
  for (const s of fresh.slice(0, 10)) console.log(`NEW [${s.id}] ${s.name} | ${s.title} | ${s.company} | ${s.url}`);
}
