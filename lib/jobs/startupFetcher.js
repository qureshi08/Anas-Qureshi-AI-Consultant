/**
 * Reverse pitch lane (added 2026-09-22): fresh, small startups to pitch directly, before they
 * ever post a job. Anas's own words: it is easier to land work through a direct link to the
 * decision maker at a small company than through a crowded job posting. Runs in the same daily
 * cron as the job and training fetchers, writes into job_leads with lane = 'Startups'.
 *
 * Source, free, no key: Y Combinator's public company directory. www.ycombinator.com/companies
 * ships a client side, search only Algolia key in window.AlgoliaOpts on every page load (the
 * key itself is restricted server side to the YCCompany indices, same trust level as the
 * LinkedIn guest job search endpoint already used elsewhere in this stack). Each company's own
 * page is server rendered and, for most, states the founders' names, LinkedIn profiles, and
 * often a published email address in the "Our Asks" section of the launch post.
 */
import { createAdminClient } from '../supabase/admin';
import { SKILLS } from './resumeData';

// The only skills Anas can truthfully claim (same source resumeData.js uses for his actual
// resume), flattened for matching against a job posting's own skills list. A handful of close,
// honest equivalents are added (Next.js implies real React work, Supabase is Postgres, Excel
// covers spreadsheet tools) without inventing anything not already true.
const RESUME_SKILLS = [...Object.values(SKILLS).flat(), 'React', 'PostgreSQL', 'Postgres', 'Spreadsheets'].map(s => s.toLowerCase());
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Splits a job's listed skills into what he genuinely has versus not, so the drafter is told
 * exactly what to reference and what to never claim, instead of guessing at overlap itself.
 * Whole word matching only (word boundaries), a short skill like "Git" must not match as a
 * substring of an unrelated word like "Digital". */
function splitSkillMatch(skills) {
  const matched = [], other = [];
  for (const s of skills || []) {
    const low = s.toLowerCase();
    const isMatch = RESUME_SKILLS.some(r => new RegExp(`\\b${escapeRegex(r)}\\b`).test(low) || new RegExp(`\\b${escapeRegex(low)}\\b`).test(r));
    (isMatch ? matched : other).push(s);
  }
  return { matched, other };
}

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };
const YC_APP = '45BWZJ1SGC';
const YC_KEY = 'NzJmMWExZWYxYzY5OGYwN2VkYWM5YzRiM2VlNDFlM2I0ODU2YjQ2Yjg0MTFiNWE5NzY0NTMyZGI1OWEwMzVjY2FuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE';
const MAX_DETAILS = 25;

// What a one person or two person team is actually likely to pay a contractor to build.
const QUERIES = ['automation', 'AI agent', 'workflow automation', 'AI receptionist', 'internal tools', 'data pipeline', 'AI operations', 'customer support automation'];
const STRONG = /automat|workflow|\bagents?\b|\bllm\b|\bai\b|\bpython\b|\bn8n\b|make\.com|zapier|data pipeline|internal tool|integrations?|\bapi\b|chatbot|voice ai|receptionist/i;

async function get(url, { timeout = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function ycSearch(query) {
  try {
    const res = await fetch(`https://${YC_APP}-dsn.algolia.net/1/indexes/YCCompany_production/query`, {
      method: 'POST',
      headers: { 'X-Algolia-API-Key': YC_KEY, 'X-Algolia-Application-Id': YC_APP, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, hitsPerPage: 20, filters: 'status:Active' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.hits || [];
  } catch {
    return [];
  }
}

/** Keeps roughly the last two and a half years of batches. Older YC companies are not "fresh". */
function isFreshBatch(batch) {
  const m = (batch || '').match(/(Winter|Spring|Summer|Fall)\s+(\d{4})/i);
  if (!m) return false;
  const order = { winter: 0, spring: 1, summer: 2, fall: 3 };
  const now = new Date();
  const nowScore = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
  const score = Number(m[2]) * 4 + order[m[1].toLowerCase()];
  return nowScore - score <= 10 && nowScore - score >= 0;
}

function relevance(hit) {
  const blob = `${hit.one_liner || ''} ${hit.long_description || ''} ${(hit.industries || []).join(' ')} ${(hit.tags || []).join(' ')}`;
  let s = 0;
  if (STRONG.test(blob)) s += 3;
  if (hit.isHiring) s += 2;
  if (typeof hit.team_size === 'number' && hit.team_size > 0 && hit.team_size <= 15) s += 2;
  else if (typeof hit.team_size === 'number' && hit.team_size <= 30) s += 1;
  return s;
}

/**
 * Reads the company's own YC page: founders' names (from the server rendered meta description,
 * "Name1 and Name2, Company has N employees..."), the first founder's LinkedIn profile, and any
 * email published on the company's own domain. Best effort, never throws.
 */
const PERSON_NAME_RX = /^[A-Z][a-zA-Z'.]+(?:\s[A-Z][a-zA-Z'.]+){1,3}$/;

/**
 * Founder name, their LinkedIn, and a contact email: three separate best-effort scrapes that
 * MUST NOT be mixed across different people. A real bug (2026-09-22): the meta description's
 * founder order and the page's actual founder card order sometimes disagree (Finosu's meta
 * description said "Gabriel Vincent Kho and Mark Ricciardi", but the published contact email
 * was Mark's), so picking founders[0] as "the" contact name independent of which email was
 * actually found sent a pitch addressed to the wrong person. Fixed by (1) pairing each name
 * with ITS OWN LinkedIn link by DOM proximity, never a name from one place and a link from
 * another, and (2) only attaching a name to an email when the email's own local part actually
 * names that person. An unverifiable pairing returns the email with no name attached, never a
 * guessed one, on the same principle contactFinder.js already uses: a wrong name is worse than
 * no name.
 */
/**
 * The company page embeds its own real open roles as a JSON block ("jobPostings":[...]), plain
 * HTML, no login, a different mechanism from the Work at a Startup job search index (which IS
 * login gated, confirmed separately). Each entry carries the actual title, required skills,
 * salary, equity, experience level and visa terms Anas needs to pitch the SPECIFIC role, not a
 * generic "I build automation" pitch when a real, detailed requirement is sitting right there.
 */
function parseJobPostings(html) {
  const m = html.match(/&quot;jobPostings&quot;:(\[.*?\])(?=,&quot;jobsUrl&quot;)/);
  if (!m) return [];
  try {
    return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"));
  } catch {
    return [];
  }
}

/** Picks whichever listed role's title and skills best match Anas's actual stack, so the pitch
 * targets the role he could really do, not just the first one listed. */
// Anas has 2 years of experience. A role whose title or stated floor asks for meaningfully more
// than that is not a role he can honestly pitch himself for, no matter how well its skills match.
const SENIOR_TITLE_RX = /\bsenior\b|\bsr\.?\b|\bstaff\b|\bprincipal\b|\blead\b|\bdirector\b|\bvp\b|\bvice president\b|\bhead of\b|\bfounding head\b|\bchief\b|\bmanager\b/i;
// Text fallback ONLY for postings with no role field at all. Real bug found 2026-09-23: some
// companies title postings after famous people as a gimmick ("Jony Ive" for a web design role,
// "Greg Brockman" for engineering, "Bill McDermott (Account Executive)" for sales), which
// defeats any text based filter completely, so role type must come from YC's own canonical
// `role` field ("eng", "design", "sales", "operations"...) whenever it is present, never from
// guessing at the title text.
const NON_ENG_TITLE_RX = /account executive|\bsales\b|business development|\bbd\b|\bgtm\b|go.to.market|marketing|customer success|\brecruiter\b|recruiting|support specialist|community manager|\blegal\b|\bfinance\b|\baccounting\b/i;
const ENG_ROLE_FIELDS = new Set(['eng', 'data', 'ml', 'ai', 'engineering']);
/** True when the role's own stated experience floor is roughly new grad through 3 years. */
function experienceOk(minExperience) {
  const s = (minExperience || '').toLowerCase();
  if (!s || s.includes('any') || s.includes('new grad')) return true;
  const n = s.match(/(\d+)/);
  if (!n) return true; // an unparseable string is not a reason to reject a role
  return Number(n[1]) <= 3;
}

/** Picks whichever listed, actually-appropriate role's title and skills best match Anas's
 * stack. Filters out roles above his real experience level and non-engineering roles first,
 * by the canonical role field when it exists, title text only as a fallback when it does not. */
function pickBestJob(jobs) {
  const eligible = jobs.filter(j => {
    const title = j.title || '';
    if (SENIOR_TITLE_RX.test(title)) return false;
    if (j.role) { if (!ENG_ROLE_FIELDS.has(j.role)) return false; }
    else if (NON_ENG_TITLE_RX.test(title)) return false;
    return experienceOk(j.minExperience);
  });
  if (!eligible.length) return null;
  const scored = eligible.map(j => {
    const blob = `${j.title || ''} ${(j.skills || []).join(' ')}`;
    const s = (j.minExperience || '').toLowerCase();
    // Among several eligible roles, prefer the one closest to his actual level, not just
    // whichever happens to clear the 3 year ceiling.
    const experienceBonus = !s || s.includes('any') || s.includes('new grad') ? 1 : 0;
    // Real skill overlap decides fit more than a generic keyword match. A role whose skills
    // list is AWS, COBOL, Google Cloud, Python, React, TypeScript is only a 2 of 6 match, not
    // the strong hit a blanket "contains an AI buzzword" check would have scored it as.
    const { matched } = splitSkillMatch(j.skills);
    return { job: j, matched, score: matched.length * 2 + (STRONG.test(blob) ? 1 : 0) + experienceBonus };
  });
  // A listed skills array with zero real overlap is not a role he can honestly pitch himself
  // for, even if it clears every other filter. No skills listed at all is not the same thing,
  // that just means the posting did not specify, so it stays eligible.
  const usable = scored.filter(x => !x.job.skills?.length || x.matched.length > 0);
  if (!usable.length) return null;
  usable.sort((a, b) => b.score - a.score);
  return usable[0].job;
}

async function companyDetail(slug, websiteDomain) {
  try {
    const html = await get(`https://www.ycombinator.com/companies/${slug}`);

    const founders = [];
    const seenNames = new Set();
    const blockRx = /text-xl font-bold">([^<]+)<[\s\S]{0,500}?linkedin\.com\/in\/([A-Za-z0-9_-]+)/g;
    let m;
    while ((m = blockRx.exec(html))) {
      const name = m[1].trim();
      if (!PERSON_NAME_RX.test(name) || seenNames.has(name)) continue;
      seenNames.add(name);
      founders.push({ name, linkedin: `https://www.linkedin.com/in/${m[2]}` });
    }

    let email = null;
    let allEmails = [];
    if (websiteDomain) {
      const rx = new RegExp(`[A-Za-z0-9._%+-]+@${websiteDomain.replace(/\./g, '\\.')}`, 'gi');
      allEmails = [...new Set((html.match(rx) || []).filter(e => !/sentry|wixpress|noreply|no-reply/i.test(e)).map(e => e.toLowerCase()))];
      if (allEmails.length) email = allEmails[0];
    }

    let matched = null;
    if (email && founders.length) {
      const local = email.split('@')[0].toLowerCase();
      matched = founders.find(f => local.includes(f.name.split(' ')[0].toLowerCase()));
    }

    // allFounders/allEmails are every candidate found, not just the picked primary. Whether a
    // LinkedIn profile is open to messages, or whether an email actually reaches someone (the
    // "item" bounce, see feedback_no_domain_validation_before_send), can only be confirmed by
    // trying, so hand over the real alternatives instead of silently discarding them.
    const allFounders = founders.map(f => ({ name: f.name, linkedin: f.linkedin }));
    const otherEmails = allEmails.filter(e => e !== email);
    const job = pickBestJob(parseJobPostings(html));

    const base = matched ? { founders: [matched.name], contact_url: matched.linkedin, email }
      : email ? { founders: [], contact_url: founders[0]?.linkedin || null, email }
      : founders.length ? { founders: [founders[0].name], contact_url: founders[0].linkedin, email: null }
      : { founders: [], contact_url: null, email: null };
    return { ...base, allFounders, otherEmails: matched || email ? otherEmails : [], job };
  } catch {
    return { founders: [], contact_url: null, email: null, allFounders: [], otherEmails: [], job: null };
  }
}

export async function fetchAndStoreStartups({ budgetMs = 40000, maxDetails = MAX_DETAILS } = {}) {
  const started = Date.now();
  const deadline = started + budgetMs;
  const admin = createAdminClient();

  const seen = new Map();
  for (const q of QUERIES) {
    if (Date.now() > deadline) break;
    for (const hit of await ycSearch(q)) {
      if (!hit.slug || !hit.name || hit.status !== 'Active') continue;
      if (!isFreshBatch(hit.batch)) continue;
      if (seen.has(hit.slug)) continue;
      seen.set(hit.slug, hit);
    }
  }

  const candidates = [...seen.values()].map(h => ({ ...h, _score: relevance(h) })).filter(h => h._score >= 3).sort((a, b) => b._score - a._score);

  const { data: existingKeys } = await admin.from('job_leads').select('key').eq('lane', 'Startups');
  const known = new Set((existingKeys || []).map(r => r.key));

  const rows = [];
  let details = 0;
  for (const c of candidates) {
    let website = '';
    try { website = c.website ? new URL(c.website).hostname.replace(/^www\./, '') : ''; } catch { website = ''; }
    const key = website || `yc:${c.slug}`;
    if (known.has(key)) continue;

    let founders = [], contact_url = null, email = null, allFounders = [], otherEmails = [], job = null;
    if (details < maxDetails && Date.now() < deadline) {
      details++;
      ({ founders, contact_url, email, allFounders, otherEmails, job } = await companyDetail(c.slug, website));
    }

    // Other founders and other emails are real alternates for when the picked primary contact
    // turns out unreachable (a locked LinkedIn profile) or wrong (a bounced or dead address) —
    // both can only be confirmed by trying, never scraped with certainty, so hand them over
    // instead of leaving Anas stuck on a single pick with no fallback.
    const others = allFounders.filter(f => f.name !== founders[0]);
    const notesParts = [];
    if (others.length) notesParts.push(`Other founders, try if the primary contact is unreachable: ${others.map(f => `${f.name} (${f.linkedin})`).join(', ')}`);
    if (otherEmails.length) notesParts.push(`Other emails found on their site, try if the primary one bounces: ${otherEmails.join(', ')}`);
    const altNote = notesParts.length ? notesParts.join('\n') : null;

    // The real, specific open role (if one is listed) is what the pitch must actually be about,
    // per Anas: pitch to the requirement, not a generic "I build automation" line every time.
    // Skills are split into what he genuinely has versus not, computed here rather than left for
    // the model to work out, since a job's real skill list (AWS, COBOL, Google Cloud, Python,
    // React, TypeScript, a real example) is often only a partial match, and guessing wrong means
    // either overclaiming or citing an irrelevant skill. Appended to description so the drafter
    // sees it as part of what it already reads.
    const skillSplit = job ? splitSkillMatch(job.skills) : null;
    const jobLine = job
      ? `\n\nOpen role: ${job.title}${job.roleSpecificType ? ` (${job.roleSpecificType})` : ''}, ${job.location || 'location unstated'}, ${job.salaryRange || 'salary unstated'}${job.equityRange ? `, ${job.equityRange}` : ''}, experience ${job.minExperience || 'unstated'}, visa: ${job.visa || 'unstated'}. Skills asked for: ${(job.skills || []).join(', ') || 'none listed'}. Of those, Anas genuinely has: ${skillSplit.matched.join(', ') || 'none of the listed skills, this is a real stretch'}. NOT on his resume, never claim these: ${skillSplit.other.join(', ') || 'none'}.`
      : '';

    rows.push({
      key, source: 'yc_startup',
      title: (job ? `${c.name} — hiring ${job.title}` : `${c.name} — ${(c.one_liner || '').slice(0, 140)}`).slice(0, 200),
      company: c.name.slice(0, 160), location: (c.all_locations || 'Remote').slice(0, 160),
      lane: 'Startups', url: `https://www.ycombinator.com/companies/${c.slug}`,
      posted_at: null, score: c._score + 4 + (job ? 2 : 0),
      salary_label: job?.salaryRange || 'unknown', shape: 'contract',
      description: (((c.long_description || c.one_liner || '') + jobLine)).slice(0, 4000),
      status: 'new',
      contact_name: founders[0] || null, contact_url, contact_email: email, contact_role: 'Founder',
      notes: altNote,
    });
    known.add(key);
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { data, error } = await admin.from('job_leads').upsert(chunk, { onConflict: 'key', ignoreDuplicates: true }).select('id');
    if (error) throw new Error(`startup upsert failed: ${error.message}`);
    inserted += (data || []).length;
  }
  return { ok: true, searched: seen.size, candidates: candidates.length, detailsFetched: details, inserted, ms: Date.now() - started };
}
