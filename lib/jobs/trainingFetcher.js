/**
 * AI training and data labeling listings, side lane of the Jobs stream (added 2026-09-20).
 * Runs inside the same daily cron as the job fetcher and writes into the same job_leads table
 * with lane = 'Training', so the one job at a time flow, drafting and follow ups all apply.
 *
 * Sources, all free, no keys:
 *   1. OpenTrain's public Pakistan listing page (schema.org data, each posting is open to Pakistan)
 *   2. LinkedIn public job search for AI trainer, LLM trainer, RLHF, annotation, Urdu language work
 *   3. Public Lever and Greenhouse boards of vendors that hire trainers and Urdu specialists
 * Evergreen platform sign ups (Turing, Mindrift, TELUS...) are seeded as source = 'platform'
 * rows and are never expired.
 */
import { createAdminClient } from '../supabase/admin';

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };
const MIN_HOURLY = 12; // below this a posting is not worth a proposal

const TRAINING_LINKEDIN_KEYWORDS = ['AI trainer', 'LLM trainer', 'RLHF', 'AI data annotator', 'AI evaluator', 'Urdu language specialist', 'data annotation expert'];
const TRAINING_LINKEDIN_LOCATIONS = ['Pakistan', 'Worldwide'];

// Vendors with public job APIs that post trainer and Urdu roles. Extend by adding a slug.
const TRAINING_BOARDS = [
  { ats: 'lever', slug: 'weloglobal', company: 'Welo Data' },
  { ats: 'greenhouse', slug: 'agency', company: 'Invisible Technologies' },
];

// Anas's background decides relevance: charts, BI, finance and risk, Python, SQL, LLM work, Urdu.
// "reasoning" and "expert"/"task author" alone are domain-agnostic wrapper words every OpenTrain
// listing uses (life sciences reasoning, legal reasoning, clinical reasoning...) — they cannot
// carry a listing on their own, only a real subject-matter match can.
const STRONG = /chart|visuali[sz]|dashboard|data analy|statistic|quantitative|financ|econom|\brisk\b|accounting|\bpython\b|\bsql\b|\bcoding\b|code review|\bsoftware\b|data scien|machine learning|\bllm\b|\bprompt\b|\bai (agent|reasoning)\b|urdu|business analy|\banalytics\b|backend|\bapi\b|automation|\bn8n\b|equity research/i;
const MILD = /evaluat|rater|rating|annotat|\blabel\b/i;
const DROP = /japanese|korean|spanish|chinese|mandarin|cantonese|italian|french|german|portuguese|russian|arabic|hindi|bengali|turkish|vietnamese|thai|indonesian|polish|dutch|swedish|norwegian|danish|finnish|greek|hebrew|farsi|persian|tagalog|swahili|nurs|physician|clinical|pharmac|dentist|veterinar|\blaw\b|legal|attorney|chemistr|biolog|life science|scientific|medical|health|therap|psychiat|counsel|social work|mechanical|electrical|civil eng|architect|music|film|television|producer|teacher|sociolog|psycholog|photograph|\baudio\b|\bvideo\b|\bvoice\b|speech|recording|translation|translator|marketing presentation|powerpoint|clickup|project management/i;

export function trainingScore(title) {
  const t = title || '';
  if (DROP.test(t) && !/urdu/i.test(t)) return -9;
  const strongHit = STRONG.test(t);
  const urduHit = /urdu/i.test(t);
  // A real subject-matter match (or Urdu, his native-language edge) is required to pass at all.
  // "Evaluator"/"annotator"/"rater" alone, with no domain fit, is exactly the generic-expert
  // noise that was slipping through before this fix.
  if (!strongHit && !urduHit) return -9;
  let s = 0;
  if (strongHit) s += 4;
  if (MILD.test(t)) s += 2;
  if (urduHit) s += 3;
  return s;
}

async function get(url, { timeout = 15000, json = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return json ? res.json() : res.text();
  } finally {
    clearTimeout(t);
  }
}
const unescapeHtml = s => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
const stripHtml = s => unescapeHtml((s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Pull "$25-$50 per hour" style pay out of posting text. Returns { label, low } or null. */
function hourlyPay(text) {
  const m = (text || '').match(/\$\s?(\d{1,3})(?:\.\d+)?\s*(?:-|–|to)\s*\$?\s?(\d{1,3})(?:\.\d+)?\s*(?:per hour|\/\s?h(?:ou)?r|an hour)/i)
    || (text || '').match(/\$\s?(\d{1,3})(?:\.\d+)?\s*()(?:per hour|\/\s?h(?:ou)?r|an hour)/i);
  if (!m) return null;
  const low = Number(m[1]);
  return { low, label: m[2] ? `$${m[1]} to $${m[2]}/hr` : `$${m[1]}/hr` };
}

// ---------- OpenTrain ----------
async function feedOpenTrain() {
  const html = await get('https://www.opentrain.ai/jobs/country/pakistan/', { timeout: 20000 });
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/"url":"(https:\/\/www\.opentrain\.ai\/jobs\/[^"]+--[a-z0-9]+\/)","name":"([^"]+)"/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ source: 'opentrain', url: m[1], title: unescapeHtml(m[2]), company: 'OpenTrain AI', location: 'Remote, open to Pakistan' });
  }
  return out;
}

/** Detail page JobPosting data: date, pay, real description, and whether Pakistan is eligible. */
async function openTrainDetail(url) {
  const html = await get(url, { timeout: 15000 });
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let o;
    try { o = JSON.parse(m[1]); } catch { continue; }
    if (o['@type'] !== 'JobPosting') continue;
    const desc = stripHtml(o.description || '');
    const countries = (o.applicantLocationRequirements || []).map(c => c.name);
    return {
      posted: o.datePosted ? new Date(o.datePosted) : null,
      valid: o.validThrough ? new Date(o.validThrough) : null,
      description: desc.slice(0, 7000),
      pakistan: !countries.length || countries.includes('Pakistan'),
      pay: hourlyPay(desc),
    };
  }
  return null;
}

// ---------- LinkedIn ----------
async function feedLinkedinTraining(deadline) {
  const tasks = [];
  for (const loc of TRAINING_LINKEDIN_LOCATIONS) for (const kw of TRAINING_LINKEDIN_KEYWORDS) tasks.push({ loc, kw: loc === 'Pakistan' ? kw : `${kw} remote` });
  const out = [], seen = new Set();
  let i = 0;
  async function worker() {
    while (i < tasks.length && Date.now() < deadline) {
      const t = tasks[i++];
      const q = new URLSearchParams({ keywords: t.kw, location: t.loc, f_TPR: 'r604800', start: '0' });
      let html;
      try { html = await get('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?' + q, { timeout: 12000 }); } catch { continue; }
      for (const c of html.match(/<li>[\s\S]*?<\/li>/g) || []) {
        const mUrl = c.match(/class="base-card__full-link[^"]*"\s+href="([^"]+)"/);
        const mTitle = c.match(/<span class="sr-only">\s*([\s\S]*?)\s*<\/span>/);
        const mComp = c.match(/base-search-card__subtitle[^>]*>\s*(?:<a[^>]*>)?\s*([\s\S]*?)\s*(?:<\/a>)?\s*<\/h4>/);
        const mLoc = c.match(/job-search-card__location[^>]*>\s*([\s\S]*?)\s*<\/span>/);
        const mTime = c.match(/<time[^>]*datetime="([^"]+)"/);
        if (!mUrl || !mTitle) continue;
        const url = unescapeHtml(mUrl[1]).split('?')[0];
        if (seen.has(url)) continue;
        seen.add(url);
        out.push({ source: 'linkedin_training', url, title: unescapeHtml(mTitle[1]), company: mComp ? unescapeHtml(mComp[1]) : '', location: mLoc ? unescapeHtml(mLoc[1]) : t.loc, posted: mTime ? new Date(mTime[1]) : null });
      }
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  return out;
}

// ---------- vendor boards ----------
async function feedBoards() {
  const out = [];
  for (const b of TRAINING_BOARDS) {
    try {
      if (b.ats === 'lever') {
        const data = await get(`https://api.lever.co/v0/postings/${b.slug}?mode=json`, { json: true });
        for (const j of data || []) out.push({ source: 'vendor_board', url: j.hostedUrl, title: j.text, company: b.company, location: j.categories?.location || '', posted: j.createdAt ? new Date(j.createdAt) : null, description: stripHtml(j.descriptionPlain || j.description || '').slice(0, 4000) });
      } else {
        const data = await get(`https://boards-api.greenhouse.io/v1/boards/${b.slug}/jobs?content=true`, { json: true });
        for (const j of data.jobs || []) out.push({ source: 'vendor_board', url: j.absolute_url, title: j.title, company: b.company, location: j.location?.name || '', posted: j.updated_at ? new Date(j.updated_at) : null, description: stripHtml(unescapeHtml(j.content || '')).slice(0, 4000) });
      }
    } catch { /* one dead board must not stop the rest */ }
  }
  return out;
}

/** Pakistan and Gulf are the fast lane, US and EU only postings are useless to him. */
const CLOSED_LOC = /united states|\busa?\b|canada|united kingdom|\buk\b|germany|france|spain|poland|australia|brazil|mexico|india\b/i;

export async function fetchAndStoreTraining({ budgetMs = 45000, maxDetails = 12 } = {}) {
  const started = Date.now();
  const deadline = started + budgetMs;
  const admin = createAdminClient();
  const stats = {};

  const results = await Promise.all([
    feedOpenTrain().then(r => ({ name: 'opentrain', r })).catch(e => ({ name: 'opentrain', err: e.message })),
    feedLinkedinTraining(deadline).then(r => ({ name: 'linkedin_training', r })).catch(e => ({ name: 'linkedin_training', err: e.message })),
    feedBoards().then(r => ({ name: 'vendor_boards', r })).catch(e => ({ name: 'vendor_boards', err: e.message })),
  ]);
  const raw = [];
  for (const res of results) {
    if (res.err) { stats[res.name] = `FAILED ${res.err}`; continue; }
    stats[res.name] = res.r.length;
    raw.push(...res.r);
  }

  const { data: buried } = await admin.from('job_seen_keys').select('key');
  const buriedKeys = new Set((buried || []).map(b => b.key));
  const keyOf = j => j.url.split('?')[0].replace(/\/$/, '');
  const candidates = [];
  const seen = new Set();
  const dropped = { relevance: 0, location: 0, pay: 0, ineligible: 0, dupe: 0, buried: 0 };
  for (const j of raw) {
    if (!j.url || !j.title) continue;
    const key = keyOf(j);
    if (seen.has(key)) { dropped.dupe++; continue; }
    seen.add(key);
    if (buriedKeys.has(key)) { dropped.buried++; continue; }
    const score = trainingScore(j.title);
    if (score < 2) { dropped.relevance++; continue; }
    if (j.location && CLOSED_LOC.test(j.location) && !/pakistan|remote|worldwide|anywhere/i.test(j.location)) { dropped.location++; continue; }
    candidates.push({ ...j, key, score });
  }

  // Only rows not already stored cost a detail request.
  const keys = candidates.map(c => c.key);
  const existing = new Set();
  for (let i = 0; i < keys.length; i += 100) {
    const { data } = await admin.from('job_leads').select('key').in('key', keys.slice(i, i + 100));
    for (const r of data || []) existing.add(r.key);
  }
  const fresh = candidates.filter(c => !existing.has(c.key));

  const rows = [];
  let details = 0;
  for (const c of fresh) {
    let posted = c.posted || null, description = c.description || null, pay = hourlyPay(c.description || ''), eligible = true;
    if (c.source === 'opentrain' && details < maxDetails && Date.now() < deadline) {
      details++;
      try {
        const d = await openTrainDetail(c.url);
        if (d) {
          posted = d.posted; description = d.description; pay = d.pay; eligible = d.pakistan;
          if (d.valid && d.valid.getTime() < Date.now()) eligible = false;
        }
      } catch { /* keep the list data, the drafter refetches the page text */ }
    }
    if (!eligible) { dropped.ineligible++; continue; }
    if (pay && pay.low < MIN_HOURLY) { dropped.pay++; continue; }
    let score = c.score + (pay && pay.low >= 25 ? 2 : 0) + (c.source === 'opentrain' ? 2 : 0) + (/pakistan/i.test(c.location || '') ? 1 : 0);
    rows.push({
      key: c.key, source: c.source, title: c.title.slice(0, 200), company: (c.company || '').slice(0, 160), location: (c.location || '').slice(0, 160),
      lane: 'Training', url: c.url, posted_at: posted ? posted.toISOString() : null, score,
      salary_label: pay ? pay.label : 'unknown', shape: 'contract', description, status: 'new',
    });
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await admin.from('job_leads').upsert(rows.slice(i, i + 100), { onConflict: 'key', ignoreDuplicates: true }).select('id');
    if (error) throw new Error(`training upsert failed: ${error.message}`);
    inserted += (data || []).length;
  }
  return { ok: true, raw: raw.length, candidates: candidates.length, fresh: fresh.length, inserted, dropped, sources: stats, ms: Date.now() - started };
}
