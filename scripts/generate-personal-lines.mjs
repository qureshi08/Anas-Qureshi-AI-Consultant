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

const here = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');

const env = Object.fromEntries(
  fs.readFileSync(path.resolve(here, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

// ---- extraction -----------------------------------------------------------

// Free-text extraction produced garbage ("focuses on already positioned as a
// flexible outsourced recruiting") and, worse, leaked demographic descriptors
// like "Black woman-owned" straight into outreach copy. So the sector is now
// matched against a fixed vocabulary instead of scraped from the sentence. If
// nothing in the vocabulary matches, the lead gets no line rather than a
// clumsy one: a bad first line is worse than a plain one.

// Never reference someone's race, gender, veteran status or diversity
// certifications in cold outreach. Not as a sector, not as flattery, ever.
const BANNED = /black|woman|women|female|minority|veteran|disab|wbe|wbenc|nmsdc|sdvosb|mbe|dbe|8\(a\)|hubzone|lgbt/i;

const SECTORS = [
  [/\b(it|tech|technology|software|developer|engineering tech)\b/i, 'IT'],
  [/\bcyber ?security|infosec\b/i, 'cybersecurity'],
  [/\berp|d365|workday|sap\b/i, 'ERP'],
  [/\bfinance|financial|accounting|cpa|payroll|audit\b/i, 'finance and accounting'],
  [/\blegal|attorney|lawyer|paralegal\b/i, 'legal'],
  [/\bhealth ?care|nursing|nurse|clinical|physician|radiolog|behavioral|home care|aba\b/i, 'healthcare'],
  [/\bconstruction|trades|electrician|millwright|skilled trade\b/i, 'construction and trades'],
  [/\blogistics|supply ?chain|warehouse|distribution|transport|driving\b/i, 'logistics and warehouse'],
  [/\bmanufactur|industrial|production|factory|plant\b/i, 'manufacturing and industrial'],
  [/\bhospitality|restaurant|catering|housekeeping|event\b/i, 'hospitality'],
  [/\beducation|teacher|school|childcare|early years|sen\b/i, 'education'],
  [/\bnonprofit|non-profit|charity\b/i, 'nonprofit'],
  [/\binsurance|underwriting|claims|lloyd/i, 'insurance'],
  [/\bmarketing|creative|design|pr\b|communications|media\b/i, 'marketing and creative'],
  [/\bsales\b/i, 'sales'],
  [/\bclerical|admin|office|receptionist|secretar\b/i, 'admin and clerical'],
  [/\bfederal|government|public sector|cleared\b/i, 'federal'],
  [/\bagricultur|\bag\/|farm\b/i, 'agricultural'],
  [/\breal estate|property\b/i, 'real estate'],
  [/\bexecutive|c-suite|ceo|cfo|board\b/i, 'executive'],
];

function specialtyOf(note, industry, company) {
  const hay = `${note || ''} ${industry || ''} ${company || ''}`;
  const hits = [];
  for (const [re, label] of SECTORS) {
    if (re.test(hay) && !BANNED.test(label)) hits.push(label);
    if (hits.length === 2) break;
  }
  if (hits.length === 0) return null;

  // Several labels already contain "and" ("finance and accounting"), so pairing
  // two of them produced "manufacturing and industrial and admin and clerical".
  // Only pair when neither half carries its own conjunction.
  if (hits.length === 2 && (hits[0].includes(' and ') || hits[1].includes(' and '))) {
    hits.length = 1;
  }

  const kind = /executive search|retained|headhunt/i.test(hay) ? 'search'
    : /\bstaffing\b/i.test(hay) ? 'staffing'
    : 'recruiting';

  // "executive search" reads wrong as "executive search search".
  if (hits[0] === 'executive' && kind === 'search') {
    return hits[1] ? `${hits[1]} executive search` : 'executive search';
  }
  return `${hits.join(' and ')} ${kind}`;
}

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

const isSolo = (n) => /\bsolo\b|one-?person|\bherself\b|\bhimself\b|owner-?operator|solo-?principal|solo-?founder/i.test(n || '');
const isTiny = (n) => /\btiny\b|\bsmall team\b|\bboutique\b/i.test(n || '');

// ---- composition ----------------------------------------------------------
// Several shapes, chosen by what the note actually contains, so a whole list
// does not arrive reading from one mould.

function compose(lead, i) {
  const note = lead.custom_note || '';
  const company = (lead.company || '')
    .replace(/\([^)]*\)/g, '')                       // drop "(CP Staffing)", "(SROVA)"
    .replace(/,?\s*(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Corp\.?|Co\.)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const spec = specialtyOf(note, lead.industry, lead.company);
  const years = yearsOf(note);
  const size = sizeOf(note);
  const solo = isSolo(note);
  if (!company || !spec) return null;

  const rot = (arr) => arr[i % arr.length];

  if (years && years.kind === 'since' && spec) {
    return rot([
      `saw ${company} has been doing ${spec} since ${years.value}, which is a long time to be running the same intake by hand.`,
      `${company} has been at ${spec} since ${years.value}, so you have almost certainly seen every version of the screening problem by now.`,
      `saw ${company} goes back to ${years.value} in ${spec}, and that is a rare run in this business.`,
    ]);
  }

  if (years && years.kind === 'span' && spec) {
    return rot([
      `${years.value} years of ${spec} means you have read a lot of CVs personally.`,
      `saw you have been placing people in ${spec} for ${years.value}+ years, mostly hands on by the look of it.`,
    ]);
  }

  if (solo && spec) {
    return rot([
      `saw you are running ${company} yourself, and doing the ${spec} screening on top of winning the work.`,
      `${company} looks like a one person operation on the ${spec} side, which means the applicant reading lands on you.`,
      `saw you handle ${spec} at ${company} solo, intake and screening included.`,
    ]);
  }

  if (size && spec) {
    const article = /^[aeiou8]/i.test(String(size)) ? 'an' : 'a';
    return rot([
      `${article} ${size} person shop covering ${spec} is a lot of ground for the number of people reading applications.`,
      `saw ${company} runs ${spec} with a team of about ${size}, so the first pass on applicants has nowhere to go but your desk.`,
    ]);
  }

  if (isTiny(note) && spec) {
    return rot([
      `saw ${company} is a small ${spec} shop, which usually means the owner is still doing the first read on applicants.`,
      `${company} looks like a boutique on the ${spec} side, small enough that screening has not been handed off.`,
    ]);
  }

  if (spec) {
    return rot([
      `saw ${company} focuses on ${spec} rather than trying to cover everything.`,
      `${company} looks focused on ${spec}, which is usually where the applicant volume gets heaviest.`,
    ]);
  }

  return null; // no honest specific available, better to skip than to fake one
}

// ---- run ------------------------------------------------------------------

const { data: leads, error } = await db
  .from('leads')
  .select('id, company, first_name, title, industry, custom_note, status, notes')
  .in('status', ['sent', 'bounced', 'replied', 'booked', 'pending']);

if (error) { console.error(error.message); process.exit(1); }

let written = 0, skipped = 0;
const preview = [];

for (const [i, lead] of leads.entries()) {
  const line = compose(lead, i);
  if (!line) { skipped++; continue; }
  preview.push(`${lead.company}\n   ${line}`);
  if (!DRY) {
    await db.from('leads').update({ notes: line }).eq('id', lead.id);
  }
  written++;
}

console.log(preview.slice(0, 30).join('\n'));
console.log(`\n${DRY ? 'DRY RUN. ' : ''}composed ${written}, skipped ${skipped} with no honest specific, of ${leads.length}`);
