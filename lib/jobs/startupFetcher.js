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
async function companyDetail(slug, websiteDomain) {
  try {
    const html = await get(`https://www.ycombinator.com/companies/${slug}`);
    const meta = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || html.match(/<meta[^>]+content="([^"]*)"[^>]+name="description"/i);
    // The meta description is always some variant of "[Founded in YYYY by] Name1[, Name2][
    // and NameN], Company has N employees...". Both forms (with or without "Founded in YYYY
    // by") are handled by making that prefix optional.
    let founders = [];
    if (meta) {
      const m = meta[1].match(/(?:Founded in \d{4} by )?([A-Z][\w.'-]+(?: [A-Z][\w.'-]+)+(?:,\s+[A-Z][\w.'-]+(?: [A-Z][\w.'-]+)+)*(?:,?\s+and\s+[A-Z][\w.'-]+(?: [A-Z][\w.'-]+)+)?),\s+[\w.&'-]+(?:\s[\w.&'-]+)*\s+has\s+\d+\s+employees?/i);
      if (m) founders = m[1].split(/,\s*(?:and\s+)?|\s+and\s+/).map(x => x.trim()).filter(Boolean);
    }
    const li = html.match(/linkedin\.com\/in\/[A-Za-z0-9_-]+/);
    const contact_url = li ? `https://www.${li[0]}` : null;
    let email = null;
    if (websiteDomain) {
      const rx = new RegExp(`[A-Za-z0-9._%+-]+@${websiteDomain.replace(/\./g, '\\.')}`, 'i');
      const em = html.match(rx);
      if (em && !/sentry|wixpress|noreply|no-reply/i.test(em[0])) email = em[0].toLowerCase();
    }
    return { founders, contact_url, email };
  } catch {
    return { founders: [], contact_url: null, email: null };
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

    let founders = [], contact_url = null, email = null;
    if (details < maxDetails && Date.now() < deadline) {
      details++;
      ({ founders, contact_url, email } = await companyDetail(c.slug, website));
    }

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
