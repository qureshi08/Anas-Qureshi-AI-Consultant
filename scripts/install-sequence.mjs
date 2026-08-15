/**
 * Installs the four step follow-up sequence on the recruiting campaign.
 *
 * Why: campaign_steps held exactly ONE row, so all 168 sends were one-shot.
 * Industry data puts 55 to 65% of cold email replies in the follow-ups, which
 * means most of the available replies were never in play. This is the single
 * cheapest fix available and the already-sent leads can be enrolled rather
 * than wasted.
 *
 * Timing note: the sequencer measures delay_days from the PREVIOUS send (it
 * rewrites sent_at each time it sends), so delays are gaps, not offsets from
 * step 1. 3 + 4 + 5 lands the last touch on day 12.
 *
 * Copy rules applied, from Guidelines/nick_coldoutreach_copywriting.md and the
 * 2026 research pass in BusinessOS/protocols/cold-email-research-2026-08-15.md:
 *   - personalization, then proof, then offer, then ONE small ask
 *   - under 80 words per email
 *   - short lowercase subject, "free" kept out of the subject line
 *   - every step adds something new instead of nudging
 *   - opener varied per step, since a repeated "circling back" is its own tell
 *   - no dashes, plain sentences, first person, per the locked brand voice
 *
 *   node scripts/install-sequence.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(here, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

const CAMPAIGN_ID = 2;

// Proof is deliberately limited to what Anas built himself and can show on
// demand. The employer's applicant system is real but is not usable proof
// under the locked rule, so it appears nowhere here.
const STEPS = [
  {
    step_number: 1,
    delay_days: 3,
    subject_template: 'screening at {{company_short}}',
    part_p: 'Hi {{first_name}}, {{personal_line}}',
    part_w: 'I build the layer that reads applicants against the role and flags the few worth your time, so the pile is not sitting there between your sales calls.',
    part_o: 'The AI assistant on my own site is one of mine, you can talk to it and see the standard. Happy to build one free on a single real open role of yours, working, no cost either way.',
    part_c: 'Worth a look?',
    part_signoff: 'Anas',
  },
  {
    step_number: 2,
    delay_days: 3,
    subject_template: 'Re: screening at {{company_short}}',
    part_p: 'Hi {{first_name}}, one more detail in case it helps.',
    part_w: 'It takes me about five days. You send one real job description and a batch of applicants you already have, and it comes back scoring each one against your own criteria with a short reason per candidate.',
    part_o: 'You keep the judgement. It just clears the obvious no from the pile first.',
    part_c: 'Still free, and still no call needed.',
    part_signoff: 'Anas',
  },
  {
    step_number: 3,
    delay_days: 4,
    subject_template: 'Re: screening at {{company_short}}',
    part_p: '{{first_name}}, different offer, no strings on this one.',
    part_w: 'Tell me the one role you hire for most often and I will send back a short sketch of how I would wire the screening for it.',
    part_o: 'Yours to keep whether or not you ever want it built, and whether or not you reply again after that.',
    part_c: 'Which role is it?',
    part_signoff: 'Anas',
  },
  {
    step_number: 4,
    delay_days: 5,
    subject_template: 'Re: screening at {{company_short}}',
    part_p: '{{first_name}}, closing the loop so I am not another recurring email in your inbox.',
    part_w: 'The offer stands if it is ever useful. One real role, built free, no call.',
    part_o: '',
    part_c: 'Otherwise all the best with the hiring at {{company_short}} this year.',
    part_signoff: 'Anas',
  },
];

const bodyOf = (s) => [s.part_p, s.part_w, s.part_o, s.part_c, s.part_signoff]
  .filter(p => p && p.trim()).join('\n\n');

for (const s of STEPS) {
  const row = { campaign_id: CAMPAIGN_ID, ...s, body_template: bodyOf(s) };
  const { data: existing } = await db.from('campaign_steps')
    .select('id').eq('campaign_id', CAMPAIGN_ID).eq('step_number', s.step_number).maybeSingle();

  if (existing) {
    await db.from('campaign_steps').update(row).eq('id', existing.id);
    console.log(`updated step ${s.step_number}`);
  } else {
    await db.from('campaign_steps').insert(row);
    console.log(`inserted step ${s.step_number}`);
  }
  const words = bodyOf(s).replace(/\{\{\w+\}\}/g, 'x').split(/\s+/).length;
  console.log(`   subject: ${s.subject_template}`);
  console.log(`   ${words} words, sends ${s.delay_days} days after the previous step\n`);
}

// Keep the campaign's own template in step with step 1, since the send page
// reads from campaigns, not campaign_steps.
await db.from('campaigns').update({
  subject_template: STEPS[0].subject_template,
  body_template: bodyOf(STEPS[0]),
}).eq('id', CAMPAIGN_ID);
console.log('campaign step-1 template synced.');
