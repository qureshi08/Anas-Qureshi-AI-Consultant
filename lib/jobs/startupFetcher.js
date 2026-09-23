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
    // One direction only: the job's skill must equal a resume skill, or be a whole-word part of
    // a broader resume skill phrase ("SQL" inside "relational SQL database design"). Never the
    // reverse: resume "React" must not count as job "React Native", a real overclaim that got
    // written into a row on 2026-09-24.
    const isMatch = RESUME_SKILLS.some(r => r === low || new RegExp(`\\b${escapeRegex(low)}\\b`).test(r));
    (isMatch ? matched : other).push(s);
  }
  return { matched, other };
}

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };
const YC_APP = '45BWZJ1SGC';
const YC_KEY = 'NzJmMWExZWYxYzY5OGYwN2VkYWM5YzRiM2VlNDFlM2I0ODU2YjQ2Yjg0MTFiNWE5NzY0NTMyZGI1OWEwMzVjY2FuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE';
const MAX_DETAILS = 40;

// Ordering signal only, no longer a gate. The real gate is the company's actual open role
// (pickBestJob); a company whose one liner says nothing about automation can still have a
// plain Software Engineer role Anas fits, and the eight keyword searches this used to run
// reached only 81 fresh companies out of the roughly 640 fresh ones YC marks as hiring, so the
// whole pool was exhausted in a single run (2026-09-24).
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

const unescapeHtml = s => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ');

/** Every active company YC currently marks as hiring, in one page (about 1,500, the index caps a page at 1,000 so two pages are read). */
async function ycHiringCompanies() {
  const out = [];
  for (let page = 0; page < 2; page++) {
    try {
      const res = await fetch(`https://${YC_APP}-dsn.algolia.net/1/indexes/YCCompany_production/query`, {
        method: 'POST',
        headers: { 'X-Algolia-API-Key': YC_KEY, 'X-Algolia-Application-Id': YC_APP, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '', hitsPerPage: 1000, page, filters: 'status:Active AND isHiring:true' }),
      });
      if (!res.ok) break;
      const data = await res.json();
      out.push(...(data.hits || []));
      if (page + 1 >= (data.nbPages || 1)) break;
    } catch {
      break;
    }
  }
  return out;
}

function batchScore(batch) {
  const m = (batch || '').match(/(Winter|Spring|Summer|Fall)\s+(\d{4})/i);
  if (!m) return -1;
  const order = { winter: 0, spring: 1, summer: 2, fall: 3 };
  return Number(m[2]) * 4 + order[m[1].toLowerCase()];
}

/** Keeps roughly the last two and a half years of batches. Older YC companies are not "fresh". */
function isFreshBatch(batch) {
  const score = batchScore(batch);
  if (score < 0) return false;
  const now = new Date();
  const nowScore = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
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
// Hard filter, locked 2026-09-24 per Anas: a role stating "US citizen/visa only" (no sponsorship
// language) is never eligible, full stop. Not a soft deprioritization, not something to reason
// around with the reverse-pitch/contractor distinction, an outright reject at the same stage as
// the seniority and role-type filters. "Will sponsor" and "visa not required" are real, different
// strings and stay eligible.
const BLOCKED_VISA_RX = /citizen.*visa only|visa only/i;
function visaOk(visa) {
  const s = (visa || '').toLowerCase();
  if (!s) return true; // unstated is not a known block
  return !BLOCKED_VISA_RX.test(s);
}
// Real bug found 2026-09-24: "Robotics Engineer" (no skills listed, role field "eng") passed
// every filter and was pitched to Anas, a hardware/robotics domain with nothing to do with his
// actual software/AI background. "eng" in YC's taxonomy covers hardware and robotics engineering
// too, not just software, so the role field alone cannot confirm domain fit. Hard reject titles
// that are clearly a non-software engineering discipline, regardless of skills or role field.
const DOMAIN_MISMATCH_RX = /\brobot(ic)?s?\b|\bhardware\b|\bmechanical\b|\belectrical\b|\bfirmware\b|\bchemical\b|\bbiolog(y|ical)\b|\baerospace\b|\bcivil eng|\bindustrial eng|\bmanufactur|\bmaterials? (science|engineer)|\boptical\b|\bembedded systems?\b|\bASIC\b/i;
// When no skills are listed at all, there is no structured signal to check, so the title itself
// must positively look like a software or data role before it is trusted, not just fail to look
// obviously wrong. Titles routinely reused across this codebase's other role checks.
// ML/research roles want model training and research (PyTorch, RL, papers), which the resume
// explicitly says never to claim. "AI Engineer" style LLM application roles are a different
// thing and stay allowed; these are not.
const NOT_HIS_LANE_RX = /\bml engineer\b|machine learning engineer|research (engineer|scientist)|\bdata scientist\b|\bphd\b|\bintern(ship)?\b/i;
const SOFTWARE_TITLE_RX = /software|full.?stack|backend|back.end|frontend|front.end|data engineer|\bai engineer\b|platform engineer|devops engineer|product engineer|forward deployed|founding engineer|application engineer/i;

// HARD GATES, locked 2026-09-24 per Anas ("I only have 3 years, my relevant jobs should only
// appear, nothing else"). Every one of these is an outright reject, never a score penalty.
// Real failure that forced this: Ooak Data's "Founding Data engineer, 3+ years, Paris, France"
// got picked, three misses at once (above his honest floor, a country he cannot apply in, and
// every other role there was 6+ or 11+ years).

/** The resume's hard truth is 2 years. A stated floor of 3+ is above what he can honestly
 * claim, so only "Any / new grads ok" and floors of 2 or under pass. */
function experienceOk(minExperience) {
  const s = (minExperience || '').toLowerCase();
  if (!s || s.includes('any') || s.includes('new grad')) return true;
  const n = s.match(/(\d+)/);
  if (!n) return true; // an unparseable string is not a reason to reject a role
  return Number(n[1]) <= 2;
}

/** Where he can actually apply: Pakistan, the Gulf, genuinely global remote, or the US (he has
 * confirmed he is open to relocating there for the right offer, and visa-only US roles are
 * already rejected upstream). A role tied to any other country, on site or country-restricted
 * remote ("Remote (FR)", "Remote (IN)"), is one he cannot apply to. */
const OPEN_LOC_RX = /pakistan|\bPK\b|islamabad|karachi|lahore|dubai|abu dhabi|\buae\b|\bAE\b|saudi|riyadh|\bSA\b|qatar|doha|\bQA\b|bahrain|oman|kuwait|worldwide|anywhere|global/i;
const US_LOC_RX = /\bUS\b|\bUSA\b|united states/i;
function locationOk(location) {
  const s = location || '';
  if (!s.trim()) return true; // unstated is not a known block
  if (OPEN_LOC_RX.test(s)) return true;
  // Remote with no country in the parentheses ("Remote") is global. "Remote (US)" is US-scoped
  // and allowed on the same basis as US on site. "Remote (FR)" and the like are not.
  const remoteScopes = [...s.matchAll(/remote\s*\(([^)]*)\)/gi)].map(m => m[1]);
  if (/remote/i.test(s) && !remoteScopes.length) return true;
  if (remoteScopes.some(sc => US_LOC_RX.test(sc) || OPEN_LOC_RX.test(sc))) return true;
  // On site: only US qualifies among non-open countries.
  const onSite = s.replace(/remote\s*\([^)]*\)/gi, '');
  return US_LOC_RX.test(onSite);
}

/** Picks whichever listed, actually-appropriate role best matches Anas's real stack. Every
 * gate below is a hard reject: seniority, internships, ML/research, visa, location, domain,
 * role type, experience floor, and a real skill-overlap threshold. A company with no role
 * that clears all of them gets no row at all, not a generic fallback pitch. */
function pickBestJob(jobs) {
  const eligible = jobs.filter(j => {
    const title = j.title || '';
    if (SENIOR_TITLE_RX.test(title)) return false;
    if (NOT_HIS_LANE_RX.test(title) || /intern/i.test(j.type || '')) return false;
    if (!visaOk(j.visa)) return false;
    if (!locationOk(j.location)) return false;
    if (DOMAIN_MISMATCH_RX.test(title) || DOMAIN_MISMATCH_RX.test(j.roleSpecificType || '')) return false;
    if (j.role) {
      if (!ENG_ROLE_FIELDS.has(j.role)) return false;
    } else {
      if (NON_ENG_TITLE_RX.test(title)) return false;
    }
    // With no skills listed there is nothing structured to verify against, so the title itself
    // must positively read as a software or data role, regardless of the role field ("eng"
    // covers hardware too). With skills listed, the overlap threshold below is the real check.
    if (!(j.skills?.length) && !SOFTWARE_TITLE_RX.test(title) && !SOFTWARE_TITLE_RX.test(j.roleSpecificType || '')) return false;
    return experienceOk(j.minExperience);
  });
  if (!eligible.length) return null;
  const scored = eligible.map(j => {
    const blob = `${j.title || ''} ${(j.skills || []).join(' ')}`;
    const s = (j.minExperience || '').toLowerCase();
    const experienceBonus = !s || s.includes('any') || s.includes('new grad') ? 1 : 0;
    const { matched } = splitSkillMatch(j.skills);
    return { job: j, matched, score: matched.length * 2 + (STRONG.test(blob) ? 1 : 0) + experienceBonus };
  });
  // Skill overlap threshold: when a role lists skills, he must genuinely have at least half of
  // them. One matched skill out of four (Python against ML, CUDA, data warehousing) is not a
  // role he can honestly pitch himself for.
  const usable = scored.filter(x => {
    const n = x.job.skills?.length || 0;
    return n === 0 || x.matched.length >= Math.max(1, Math.ceil(n / 2));
  });
  if (!usable.length) return null;
  usable.sort((a, b) => b.score - a.score);
  return usable[0].job;
}

/**
 * The job's own dedicated page (job.url from the jobPostings JSON, a relative path) carries the
 * full Role Overview, Responsibilities, Requirements and Nice-to-haves prose, plain text sitting
 * in that page's own meta description tag, not present at all in the company page's terse
 * skills array. This is what makes a pitch about a REQUIREMENT, not just a skills list.
 */
async function fetchJobDetailText(relativeUrl) {
  if (!relativeUrl) return '';
  try {
    const html = await get(`https://www.ycombinator.com${relativeUrl}`);
    const m = html.match(/<meta content="([^"]*)" name="description"/) || html.match(/<meta name="description" content="([^"]*)"/);
    if (!m) return '';
    return unescapeHtml(m[1]).replace(/[ \t]+\n/g, '\n').trim().slice(0, 2500);
  } catch {
    return '';
  }
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
  for (const hit of await ycHiringCompanies()) {
    if (!hit.slug || !hit.name || hit.status !== 'Active') continue;
    if (!isFreshBatch(hit.batch)) continue;
    if (seen.has(hit.slug)) continue;
    seen.set(hit.slug, hit);
  }

  // Most relevant one liners first, then newest batch first, but nothing is dropped here: the
  // company's real open role decides, below.
  const candidates = [...seen.values()].map(h => ({ ...h, _score: relevance(h) })).sort((a, b) => (b._score - a._score) || batchScore(b.batch) - batchScore(a.batch));

  const { data: existingKeys } = await admin.from('job_leads').select('key').eq('lane', 'Startups');
  const known = new Set((existingKeys || []).map(r => r.key));
  // Companies already evaluated and found to have no relevant role are remembered in
  // job_seen_keys (prefixed so they are identifiable and clearable). Without this, the daily
  // detail budget would re-evaluate the same top-scored companies every run and never progress
  // through the rest of the pool.
  const { data: buried } = await admin.from('job_seen_keys').select('key').like('key', 'startups:%');
  const evaluatedNoJob = new Set((buried || []).map(b => b.key.slice('startups:'.length)));

  const rows = [];
  const toBury = [];
  let details = 0, rejectedNoJob = 0;
  for (const c of candidates) {
    let website = '';
    try { website = c.website ? new URL(c.website).hostname.replace(/^www\./, '') : ''; } catch { website = ''; }
    const key = website || `yc:${c.slug}`;
    if (known.has(key) || evaluatedNoJob.has(key)) continue;
    if (details >= maxDetails || Date.now() >= deadline) break; // rest of the pool waits for the next run

    details++;
    const { founders, contact_url, email, allFounders, otherEmails, job } = await companyDetail(c.slug, website);

    // Relevant jobs only, nothing else (Anas, 2026-09-24). A company with no role that clears
    // every hard gate gets no row, not a generic fallback pitch, and is remembered so it is not
    // re-evaluated tomorrow.
    if (!job) { rejectedNoJob++; toBury.push({ key: `startups:${key}` }); continue; }

    // The job's own dedicated page carries the real Role Overview, Responsibilities,
    // Requirements and Nice-to-haves, plain text, not present in the terse skills array at all.
    // One extra fetch, only for the one role actually being pitched.
    const jobDetailText = job.url ? await fetchJobDetailText(job.url) : '';

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
    // "No skills listed" (the posting never said) and "skills listed but none match" (a real
    // stretch) read very differently and must not be worded the same way.
    const skillsStated = job && job.skills && job.skills.length > 0;
    const matchLine = !skillsStated
      ? 'not specified for this role, use the company description instead'
      : (skillSplit.matched.join(', ') || 'none of the listed skills, this is a real stretch');
    const jobLine = `Open role: ${job.title}${job.roleSpecificType ? ` (${job.roleSpecificType})` : ''}, ${job.location || 'location unstated'}, ${job.salaryRange || 'salary unstated'}${job.equityRange ? `, ${job.equityRange}` : ''}, experience ${job.minExperience || 'unstated'}, visa: ${job.visa || 'unstated'}. Skills asked for: ${skillsStated ? job.skills.join(', ') : 'none listed'}. Of those, Anas genuinely has: ${matchLine}. NOT on his resume, never claim these: ${skillSplit.other.join(', ') || 'none'}.${jobDetailText ? `\n\nFULL ROLE REQUIREMENT (use THIS for the pitch, quote a real bullet, never the company tagline below):\n${jobDetailText}` : ''}`;
    // The role leads the description, the generic company blurb (often four tagline-heavy
    // paragraphs) trails as background only, kept short. Burying the job requirement at the end
    // meant the model wrote from whatever it read first (a real observed failure on Lumari).
    const description = `${jobLine}\n\n(Background only, do not open with this) About the company: ${(c.long_description || c.one_liner || '').slice(0, 600)}`;

    rows.push({
      key, source: 'yc_startup',
      title: `${c.name} — hiring ${job.title}`.slice(0, 200),
      company: c.name.slice(0, 160), location: (job.location || c.all_locations || 'Remote').slice(0, 160),
      lane: 'Startups', url: `https://www.ycombinator.com/companies/${c.slug}`,
      posted_at: null, score: c._score + 6,
      salary_label: job.salaryRange || 'unknown', shape: 'contract',
      description: description.slice(0, 6500),
      status: 'new',
      contact_name: founders[0] || null, contact_url, contact_email: email, contact_role: 'Founder',
      notes: altNote,
    });
    known.add(key);
  }

  if (toBury.length) await admin.from('job_seen_keys').upsert(toBury, { onConflict: 'key', ignoreDuplicates: true });

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { data, error } = await admin.from('job_leads').upsert(chunk, { onConflict: 'key', ignoreDuplicates: true }).select('id');
    if (error) throw new Error(`startup upsert failed: ${error.message}`);
    inserted += (data || []).length;
  }
  return { ok: true, searched: seen.size, candidates: candidates.length, detailsFetched: details, rejectedNoJob, inserted, ms: Date.now() - started };
}
