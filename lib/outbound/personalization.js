/**
 * Shared personalization vocabulary. Used by scripts/generate-personal-lines.mjs
 * (offline, writes the step-1 opener into leads.notes) AND by emailService.js
 * variablesFor() (at render time, for every step of the sequence). One copy so
 * the two never drift against each other.
 *
 * Why this exists at render time too, not just at generation time: the first
 * build only personalized step 1 of the follow-up sequence. Steps 2 to 4 read
 * identically for all 173 leads except the name and company, which fails the
 * actual bar ("even the next sequence emails will feel like it's made for me").
 * specialtyOf() and titlePhraseOf() below are cheap enough to compute on every
 * render rather than needing their own stored column.
 */

// Never reference someone's race, gender, veteran status, tribal affiliation,
// disability, or diversity certification in cold outreach. Not as a sector,
// not as flattery, ever. specialtyOf() only ever returns a label from the
// controlled SECTORS list below or a number pulled by a narrow regex
// elsewhere, never a copied slice of free text, so this list guards the
// label vocabulary rather than needing to scan arbitrary prose.
export const BANNED = /black|woman|women|female|minority|veteran|disab|indigenous|navajo|tribal|tero|dobe\b|wbe|wbenc|nmsdc|sdvosb|mbe\b|dbe\b|8\(a\)|hubzone|lgbt|hispanic|latino|latina|asian[- ]american|native american|pacific islander/i;

export function stripInternalTags(note) {
  return (note || '').replace(/\[[^\]]*\]/g, ' ');
}

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

function kindOf(hay) {
  return /executive search|retained|headhunt/i.test(hay) ? 'search'
    : /\bstaffing\b/i.test(hay) ? 'staffing'
    : 'recruiting';
}

// A named vertical when one is present ("finance and accounting staffing").
// Returns null rather than a generic fallback, so callers can tell the two
// cases apart: a real vertical earns its own line shape, a generic one earns
// a plainer shape that does not pretend to more research than exists.
export function verticalOf(note, industry, company) {
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

  const kind = kindOf(hay);
  // "executive search" reads wrong as "executive search search".
  if (hits[0] === 'executive' && kind === 'search') {
    return hits[1] ? `${hits[1]} executive search` : 'executive search';
  }
  return `${hits.join(' and ')} ${kind}`;
}

// Every lead on this list is in recruiting or staffing by definition (see the
// ICP lock in BusinessOS/protocols/ai-consultant-outreach-kit.md), so when no
// named vertical matches, "recruiting" or "staffing" on its own is still a
// TRUE fact, just a plainer one.
export function specialtyOf(note, industry, company) {
  const named = verticalOf(note, industry, company);
  if (named) return named;
  const hay = `${note || ''} ${industry || ''} ${company || ''}`;
  if (/staffing|recruit|search firm|headhunt|placement|talent/i.test(hay)) return kindOf(hay);
  return null;
}

export function companyShortOf(company) {
  return (company || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/,?\s*(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Corp\.?|Co\.)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || (company || '');
}

const ACRONYMS = new Set(['CEO', 'CFO', 'COO', 'CTO', 'VP', 'HR', 'IT', 'RPO', 'ERP', 'SVP', 'EVP']);
const NOT_A_TITLE = /^(contact|not found|unknown|n\/a|-)$/i;

// A cold-title-case string ("Founder & CEO", "President, CEO and Co-Owner")
// into a lowercase phrase that reads naturally after "as" or "the": "the
// founder and CEO". Returns null when the source is empty, a placeholder like
// "Contact", or long enough that a fixed sentence around it risks reading as
// a garbled mail-merge rather than a real reference to their role. Callers
// must treat null as "omit the title clause", never substitute an empty
// string into a fixed sentence, which leaves a grammatically broken gap.
export function titlePhraseOf(title) {
  const t = (title || '').trim();
  if (!t || NOT_A_TITLE.test(t) || t.length > 40) return null;
  const phrase = t
    .replace(/&/g, 'and')
    .split(/\s+/)
    .map(w => {
      const clean = w.replace(/[,.]/g, '');
      return ACRONYMS.has(clean.toUpperCase()) ? clean.toUpperCase() : w.toLowerCase();
    })
    .join(' ')
    .replace(/\s*\/\s*/g, ' and ');
  return `the ${phrase}`;
}
