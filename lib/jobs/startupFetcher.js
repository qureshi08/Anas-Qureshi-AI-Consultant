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
    if (matched) return { founders: [matched.name], contact_url: matched.linkedin, email, allFounders, otherEmails };
    if (email) return { founders: [], contact_url: founders[0]?.linkedin || null, email, allFounders, otherEmails };
    if (founders.length) return { founders: [founders[0].name], contact_url: founders[0].linkedin, email: null, allFounders, otherEmails: [] };
    return { founders: [], contact_url: null, email: null, allFounders: [], otherEmails: [] };
  } catch {
    return { founders: [], contact_url: null, email: null, allFounders: [], otherEmails: [] };
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

    let founders = [], contact_url = null, email = null, allFounders = [], otherEmails = [];
    if (details < maxDetails && Date.now() < deadline) {
      details++;
      ({ founders, contact_url, email, allFounders, otherEmails } = await companyDetail(c.slug, website));
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

    rows.push({
      key, source: 'yc_startup',
      title: `${c.name} — ${(c.one_liner || '').slice(0, 140)}`.slice(0, 200),
      company: c.name.slice(0, 160), location: (c.all_locations || 'Remote').slice(0, 160),
      lane: 'Startups', url: `https://www.ycombinator.com/companies/${c.slug}`,
      posted_at: null, score: c._score + 4,
      salary_label: 'unknown', shape: 'contract',
      description: (c.long_description || c.one_liner || '').slice(0, 4000),
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
