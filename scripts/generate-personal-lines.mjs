/**
 * Turns each lead's internal research note into a first line that can actually
 * be sent.
 *
 * Why this exists: every lead already carries a researched `custom_note`, but
 * it is written for us ("Solo owner-operator in ag/construction recruiting;
 * seasonal high-volume hiring is a strong automation fit") and reads like a
 * dossier, not an email. The template was interpolating only first name and
 * company, which is the 1-2% generic band, while the research that would move
 * it to the 4-8% band sat unused in the same row.
 *
 * The generated line goes in `leads.notes`, which exists and was empty on every
 * row, so no schema change and no PostgREST cache reload is needed.
 *
 * Rules the output has to obey, from Guidelines/nick_coldoutreach_copywriting.md:
 *   - It is an OBSERVATION, never a guess about their pain. A pain guess reads
 *     as selling on line one, which is exactly what kills the rest of the email.
 *   - One specific true fact, drawn from their own note. No flattery.
 *   - Lowercase start, because it follows "Hi {first_name}, " in the template.
 *   - No dashes, per the brand voice rules.
 *
 *   node scripts/generate-personal-lines.mjs --dry     # print, write nothing
 *   node scripts/generate-personal-lines.mjs           # write to leads.notes
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BANNED, stripInternalTags, verticalOf, specialtyOf, companyShortOf } from '../lib/outbound/personalization.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');

const env = Object.fromEntries(
  fs.readFileSync(path.resolve(here, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

// ---- extraction -----------------------------------------------------------
// BANNED, stripInternalTags, verticalOf, specialtyOf and companyShortOf now
// live in lib/outbound/personalization.js, shared with emailService.js so the
// sector vocabulary and safety list cannot drift between the step-1 opener
// generated here and the steps 2 to 4 personalization computed at send time.

// A note can carry its own internal caveat from the sourcing pass ("WEAK
// CONFIDENCE", "verify before outreach", a bracketed [job_board_...] tag). A
// lead flagged this way gets no line and is reported separately, because
// composing confident personal copy from a note that says "unverified" is
// worse than the generic fallback ever was.
const LOW_CONFIDENCE = /weak confidence|verify before|not established|unclear|uncertain|unconfirmed|possible solo\/side-venture/i;

// Marital or family relationship structure is personal information about a
// stranger, not a business fact, and has no place in cold outreach even when
// it is volunteered in the sourcing note.
const RELATIONSHIP = /husband[- ]?wife|husband and wife|married couple/i;

function yearsOf(note) {
  const since = /\bsince (\d{4})\b/i.exec(note) || /\bfounded in (\d{4})\b/i.exec(note);
  if (since) return { kind: 'since', value: Number(since[1]) };
  const span = /\b(\d{2,3})\+?\s*years\b/i.exec(note);
  if (span) return { kind: 'span', value: Number(span[1]) };
  return null;
}

function sizeOf(note) {
  const word = /\b(two|three|four|five|six|seven|eight|nine|ten)-(?:recruiter|person|man)\b/i.exec(note);
  if (word) return word[1].toLowerCase();
  const digits = /\b(\d{1,3})-person\b/i.exec(note);
  if (digits) return digits[1];
  return null;
}

const isSolo = (n) => /\bsolo\b|one-?person|\bherself\b|\bhimself\b|owner-?operator|solo-?principal|solo-?founder|true solo operator/i.test(n || '');
const isTiny = (n) => /\btiny\b|\bsmall team\b|\bboutique\b/i.test(n || '');

function locationsOf(note) {
  const m = /\b(\d{1,2})\s*(?:locations?|branches?|offices?)\b/i.exec(note || '');
  return m ? Number(m[1]) : null;
}

// The single strongest personalization axis available: a real number that
// evidences the exact pain the offer targets. "60,000+ applications
// historically" says more than any adjective could.
function volumeOf(note) {
  const m = /\b([\d,]{2,7})\+?\s*(applications?|placements?|candidates?|resumes?|cvs?|hires?)\b/i.exec(note || '');
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!n || n < 100) return null; // small counts do not read as a "volume" claim
  const noun = /application/i.test(m[2]) ? 'applications'
    : /placement/i.test(m[2]) ? 'placements'
    : /candidate/i.test(m[2]) ? 'candidates'
    : /hire/i.test(m[2]) ? 'hires'
    : 'resumes';
  return { n: n.toLocaleString('en-US'), noun };
}

// Facts about the owner doing the work personally, which is the exact thing
// the offer removes, so this is the highest-relevance tier when present. The
// source note writes these in third person ("screens every applicant
// himself") since it was written for internal use; every phrase below is
// composed in second person instead, both because it reads better in a cold
// email and because it sidesteps ever assigning a pronoun to a stranger.
function personalActionOf(note) {
  const n = note || '';
  if (/screens? (every )?applicants? (personally|himself|herself|yourself)|screening candidates? is (her|his|your) whole product/i.test(n)) {
    return 'you are screening every applicant yourself';
  }
  if (/matches? candidates? personally|personally matches candidates/i.test(n)) {
    return 'you are personally matching every candidate';
  }
  if (/handling intake and screening (herself|himself|yourself)/i.test(n)) {
    return 'you are handling intake and screening on your own';
  }
  if (/founder still recruiting (himself|herself|yourself)/i.test(n)) {
    return 'you are still doing the recruiting yourself after all this time';
  }
  return null;
}

// A clean achievement, when one exists free of any demographic framing.
// Deliberately narrow to structural award shapes only ("named 2025 X of the
// Year", Inc. 5000) rather than a general "named ..." pattern: the general
// version matched "named Talent Acquisition staff" (a staff credit, not an
// award) and would have matched "featured in Negocios Now Hispanic Business"
// as if it were safe. Missing a real achievement is a fine trade for never
// lifting a wrong or identity-adjacent one.
function achievementOf(note) {
  const n = note || '';
  // Every branch returns a phrase shaped to follow "was", so both call-site
  // templates ("saw X was ___" and "X being ___ caught my eye") read cleanly.
  // The Inc. 5000 / best-place / fastest-growing branches return a fixed
  // string rather than anything lifted from the note, so a banned term
  // sitting elsewhere in the same sentence (a certification alongside a real
  // award, which happens often in these notes) cannot leak through them. Only
  // the "of the year" branch captures note text, so only it is checked.
  if (/\binc\.?\s*5000\b/i.test(n)) return 'recognized on the Inc. 5000 for how fast it has grown';
  const ofTheYear = /named (\d{4}\s+)?([\w' -]{4,50}?of the year)/i.exec(n);
  if (ofTheYear && !BANNED.test(ofTheYear[0])) {
    return `named ${ofTheYear[1] || ''}${ofTheYear[2]}`.replace(/\s{2,}/g, ' ').trim();
  }
  const bestPlace = /\bbest place(?:s)? to work\b/i.exec(n);
  if (bestPlace) return 'named a best place to work';
  const fastest = /\bfastest[- ]growing\b/i.exec(n);
  if (fastest) return 'named one of the fastest growing firms in the space';
  return null;
}

// ---- composition ----------------------------------------------------------
// Several shapes, chosen by what the note actually contains, so a whole list
// does not arrive reading from one mould.

function compose(lead, i) {
  const rawNote = lead.custom_note || '';
  if (LOW_CONFIDENCE.test(rawNote)) return { line: null, reason: 'low-confidence flag in sourcing note' };

  const note = stripInternalTags(rawNote);
  const company = companyShortOf(lead.company);
  if (!company) return { line: null, reason: 'no usable company name' };

  const spec = specialtyOf(note, lead.industry, lead.company);   // named vertical, or a plain "staffing/recruiting/search" fallback
  const named = verticalOf(note, lead.industry, lead.company);   // non-null only when a real vertical matched
  const years = yearsOf(note);
  const size = sizeOf(note);
  const locations = locationsOf(note);
  const volume = volumeOf(note);
  const action = personalActionOf(note);
  const achievement = achievementOf(note);
  const solo = isSolo(note);

  const rot = (arr) => arr[i % arr.length];

  // Highest tier first: a real number or a real achievement outranks a
  // category label every time, because it proves research rather than
  // asserting it.
  if (volume) {
    return { line: rot([
      `saw ${company} has handled ${volume.n}+ ${volume.noun} historically, which is a serious amount of manual reading.`,
      `${volume.n}+ ${volume.noun} over the years at ${company} is not a small-inbox problem any more.`,
    ]) };
  }

  if (achievement) {
    return { line: rot([
      `saw ${company} was ${achievement}, congratulations on that.`,
      `${company} being ${achievement} caught my eye.`,
    ]) };
  }

  if (action && spec) {
    return { line: rot([
      `saw ${action} at ${company}, on top of everything else running the business takes.`,
      `${action}, which is exactly the part of ${spec} that eats the most time.`,
    ]) };
  }

  if (years && years.kind === 'since') {
    return { line: rot([
      spec ? `saw ${company} has been doing ${spec} since ${years.value}, which is a long time to be running the same intake by hand.`
           : `saw ${company} has been running since ${years.value}, long enough to have read a lot of applications by now.`,
      spec ? `${company} has been at ${spec} since ${years.value}, so you have almost certainly seen every version of the screening problem by now.`
           : `${company} goes back to ${years.value}, which is a rare run in this business.`,
    ]) };
  }

  if (years && years.kind === 'span') {
    return { line: rot([
      spec ? `${years.value} years of ${spec} means you have read a lot of CVs personally.`
           : `${years.value} years in the business means you have read a lot of CVs personally.`,
      spec ? `saw you have been placing people in ${spec} for ${years.value}+ years, mostly hands on by the look of it.`
           : `saw you have been placing people for ${years.value}+ years, mostly hands on by the look of it.`,
    ]) };
  }

  if (locations && locations > 1) {
    return { line: rot([
      `running ${locations} locations at ${company} means a lot of open roles moving at once.`,
      `saw ${company} covers ${locations} locations, which is a lot of parallel hiring to keep on top of.`,
    ]) };
  }

  if (solo && !RELATIONSHIP.test(note)) {
    return { line: rot([
      spec ? `saw you are running ${company} yourself, and doing the ${spec} screening on top of winning the work.`
           : `saw you are running ${company} yourself, screening included, on top of winning the work.`,
      spec ? `${company} looks like a one person operation on the ${spec} side, which means the applicant reading lands on you.`
           : `${company} looks like a one person operation, which means the applicant reading lands on you.`,
      spec ? `saw you handle ${spec} at ${company} solo, intake and screening included.`
           : `saw you run ${company} solo, intake and screening included.`,
    ]) };
  }

  if (size && spec) {
    const article = /^[aeiou8]/i.test(String(size)) ? 'an' : 'a';
    return { line: rot([
      `${article} ${size} person shop covering ${spec} is a lot of ground for the number of people reading applications.`,
      `saw ${company} runs ${spec} with a team of about ${size}, so the first pass on applicants has nowhere to go but your desk.`,
    ]) };
  }

  if (isTiny(note) && spec) {
    return { line: rot([
      `saw ${company} is a small ${spec} shop, which usually means the owner is still doing the first read on applicants.`,
      `${company} looks like a boutique on the ${spec} side, small enough that screening has not been handed off.`,
    ]) };
  }

  if (spec) {
    return { line: rot([
      `saw ${company} focuses on ${spec} rather than trying to cover everything.`,
      `${company} looks focused on ${spec}, which is usually where the applicant volume gets heaviest.`,
    ]) };
  }

  return { line: null, reason: 'no honest specific found' };
}

// ---- run ------------------------------------------------------------------

const { data: leads, error } = await db
  .from('leads')
  .select('id, company, first_name, title, industry, custom_note, status, notes')
  .in('status', ['sent', 'bounced', 'replied', 'booked', 'pending']);

if (error) { console.error(error.message); process.exit(1); }

let written = 0;
const preview = [];
const lowConfidence = [];
const noSpecific = [];

for (const [i, lead] of leads.entries()) {
  const { line, reason } = compose(lead, i);
  if (!line) {
    if (reason === 'low-confidence flag in sourcing note') lowConfidence.push(lead.company);
    else noSpecific.push(lead.company);
    continue;
  }
  preview.push(`${lead.company}\n   ${line}`);
  if (!DRY) {
    await db.from('leads').update({ notes: line }).eq('id', lead.id);
  }
  written++;
}

console.log(preview.join('\n'));
console.log(`\n${DRY ? 'DRY RUN. ' : ''}composed ${written} of ${leads.length}`);
console.log(`no honest specific found: ${noSpecific.length}`);
if (lowConfidence.length) {
  console.log(`\nLOW-CONFIDENCE, held back on purpose, check by hand before sending (${lowConfidence.length}):`);
  lowConfidence.forEach(c => console.log(`  - ${c}`));
}
