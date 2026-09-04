/**
 * Job fetcher for the remote job stream (Track C). Node port of Jobs/tools/fetch_jobs.py,
 * which is now the reference implementation for local big runs only; this file is what
 * runs on Vercel (daily cron + the Refresh button on /admin/jobs).
 *
 * Sources, all free, no keys: RemoteOK, Remotive, Himalayas, Jobicy, Arbeitnow,
 * We Work Remotely (RSS), Working Nomads, Hacker News "Who is hiring", LinkedIn public
 * job search (no login), and every Greenhouse / Lever / Ashby board in job_ats_boards
 * (that table grows itself from posting URLs).
 *
 * Positioning locked 2026-09-03: AI Automation Engineer, secondary Data / Analytics.
 * Pay floor $1,500/mo where a salary is published. Pakistan and Gulf rows score +2
 * (fastest lane to money). LinkedIn's guest endpoint ignores its remote filter, so
 * "remote" is put in the keywords for every location except Pakistan.
 */
import { createAdminClient } from '../supabase/admin';

const PAY_FLOOR_ANNUAL = 1500 * 12;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };

const LINKEDIN_KEYWORDS = [
  'AI automation engineer', 'n8n', 'automation engineer python', 'AI engineer LLM',
  'data engineer python', 'analytics engineer', 'workflow automation', 'generative AI engineer',
];
const LINKEDIN_LOCATIONS = ['Pakistan', 'Worldwide', 'United Arab Emirates', 'Saudi Arabia'];
const LINKEDIN_PAGES = 2;

const POSITIVE = [
  [/\bai automation\b|\bautomation engineer\b|\bn8n\b|\bmake\.com\b|\bzapier\b/i, 4],
  [/\bagentic\b|\bai agent|\bllm\b|\blangchain\b|\blanggraph\b|\bopenai\b|\brag\b|\bgenerative ai\b|\bgen ai\b/i, 3],
  [/\bai engineer\b|\bai developer\b|\bml engineer\b|\bmachine learning engineer\b/i, 3],
  [/\bpython\b/i, 2],
  [/\bautomation\b|\bworkflow\b|\bintegration/i, 2],
  [/\bdata engineer\b|\banalytics engineer\b|\bdata analyst\b|\betl\b|\bpipeline/i, 2],
  [/\bsql\b|\btableau\b|\bpower bi\b|\bdbt\b/i, 1],
  [/\bfastapi\b|\bsupabase\b|\bnext\.?js\b|\bnode/i, 1],
  [/\binternal tools?\b|\brevops\b|\bsales ops\b|\bops engineer\b/i, 2],
];
const NEGATIVE = [
  [/\bintern(ship)?\b/i, -6],
  [/\bdirector\b|\bhead of\b|\bvp\b|\bvice president\b|\bchief\b|\bcto\b/i, -5],
  [/\bmanager\b/i, -3],
  [/\bstaff\b|\bprincipal\b|\bdistinguished\b/i, -3],
  [/\bsenior\b|\bsr\.?\b/i, -1],
  [/\blead\b/i, -2],
  [/\bjava\b(?!script)|\b\.net\b|\bc#\b|\bgolang\b|\brust\b|\bscala\b|\bkotlin\b|\bswift\b|\bios\b|\bandroid\b/i, -2],
  [/\bsales (development|representative)\b|\bsdr\b|\bbdr\b|\bbusiness development\b|\baccount executive\b|\bcustomer success\b|\brecruiter\b|\bdesigner\b|\bcopywriter\b|\bsupport (engineer|specialist|agent)\b/i, -8],
  [/\bsmartsheet\b|\bsalesforce admin|\bhubspot admin|\bwordpress\b|\bshopify\b/i, -3],
  [/\bdevops\b|\bsre\b|\bsite reliability\b|\bqa\b|\bsqa\b|\bquality assurance\b|\btest(er|ing)?\b|\bperformance test|\binfrastructure\b|\bcloud engineer\b|\boci\b|\bnetwork\b|\bsystems? engineer\b|\basic\b|\beda\b|\bsecurity engineer\b|\bembedded\b|\bfirmware\b|\bhardware\b|\bmobile\b|\bflutter\b|\breact native\b|\bgame\b|\bunity\b/i, -7],
  [/\bmlops\b|\bml ops\b|\bplatform engineer\b/i, -2],
  [/\bphd\b|\bresearch scientist\b/i, -3],
];
const LOC_OPEN = /anywhere|worldwide|world wide|global|remote\b|international|apac|asia|emea|middle east|pakistan|uae|dubai|abu dhabi|sharjah|gulf|gcc|saudi|riyadh|qatar|doha|bahrain|oman|kuwait|south asia|any location|all countries|time ?zone|utc|gmt|flexible|open to all|no restriction/i;
const LOC_CLOSED = /\b(usa?|u\.s\.|united states|us only|canada|uk|united kingdom|england|london|europe|eu\b|germany|berlin|munich|hamburg|austria|switzerland|netherlands|amsterdam|france|paris|spain|portugal|italy|poland|ireland|dublin|sweden|denmark|norway|finland|latam|latin america|brazil|mexico|argentina|colombia|australia|new zealand|japan|korea|singapore|israel|americas|north america|ny|nyc|new york|san francisco|sf bay|california|texas|austin|seattle|boston|chicago|denver|atlanta|toronto|vancouver|hong kong|china|taiwan|vietnam|india|bengaluru|bangalore|hyderabad|mumbai|pune|chennai|delhi|noida|gurgaon|gurugram|thailand|indonesia|malaysia|philippines|south africa|nigeria|kenya|egypt|turkey|ukraine|romania|czech|hungary|greece|belgium|luxembourg|estonia|lithuania|latvia|bulgaria|serbia|peru|ecuador|bolivia|chile|uruguay|paraguay|venezuela|costa rica|guatemala|rio de janeiro|sao paulo|são paulo|bogot[aá]|lima|santiago|buenos aires|montevideo|quito|medell[ií]n|monterrey|guadalajara|mexico city|cdmx)\b/i;
const US_STATE = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;
const FAST_LANE = /pakistan|uae|dubai|abu dhabi|sharjah|saudi|riyadh|jeddah|jiddah|qatar|doha|bahrain|oman|kuwait|gulf|gcc/i;

// ---------- helpers ----------
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

function unescapeHtml(s) {
  return (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#x2F;/g, '/').replace(/&nbsp;/g, ' ');
}
const stripHtml = s => unescapeHtml((s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function toDate(v) {
  if (v === null || v === undefined || v === '' || v === 0) return null;
  try {
    if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
    const s = String(v).trim();
    if (/^\d+$/.test(s)) return new Date(Number(s) < 1e12 ? Number(s) * 1000 : Number(s));
    const d = new Date(s);
    return isNaN(d) ? null : d;
  } catch { return null; }
}

function salaryAnnual(...cands) {
  for (const c of cands) {
    if (c === null || c === undefined || c === '' || c === 0 || c === '0') continue;
    if (typeof c === 'number') return c > 20000 ? c : c * 12;
    const s = String(c);
    const nums = (s.match(/\d[\d,]*\.?\d*/g) || []).map(x => parseFloat(x.replace(/,/g, ''))).filter(n => n > 100);
    if (!nums.length) continue;
    let n = Math.max(...nums);
    if (/\bk\b/i.test(s) && n < 1000) n *= 1000;
    if (/\/ ?(mo|month)|per month|monthly/i.test(s)) n *= 12;
    else if (/\/ ?(hr|hour)|per hour|hourly/i.test(s)) n *= 2000;
    return n;
  }
  return null;
}

const norm = (source, title, company, location, url, posted, extra = {}) => ({
  source, title: (title || '').trim(), company: (company || '').trim(), location: (location || '').trim(),
  url: (url || '').trim(), posted, salaryNum: null, tags: '', desc: '', remote: null, ...extra,
});

// ---------- feeds ----------
async function feedRemoteok() {
  const data = await get('https://remoteok.com/api', { json: true });
  return data.filter(j => j && j.position).map(j => norm('remoteok', j.position, j.company, j.location, j.url || `https://remoteok.com/l/${j.id}`, toDate(j.date), {
    salaryNum: salaryAnnual(j.salary_max, j.salary_min), tags: (j.tags || []).join(' '), desc: stripHtml(j.description).slice(0, 600), remote: true,
  }));
}
async function feedRemotive() {
  const data = await get('https://remotive.com/api/remote-jobs?limit=300', { json: true });
  return (data.jobs || []).map(j => norm('remotive', j.title, j.company_name, j.candidate_required_location, j.url, toDate(j.publication_date), {
    salaryNum: salaryAnnual(j.salary), tags: `${(j.tags || []).join(' ')} ${j.category || ''}`, desc: stripHtml(j.description).slice(0, 600), remote: true,
  }));
}
async function feedHimalayas() {
  const data = await get('https://himalayas.app/jobs/api?limit=200', { json: true });
  return (data.jobs || []).map(j => norm('himalayas', j.title, j.companyName, (j.locationRestrictions || []).join(', ') || 'worldwide', j.applicationLink || j.guid, toDate(j.pubDate), {
    salaryNum: salaryAnnual(j.maxSalary, j.minSalary), tags: `${(j.categories || []).join(' ')} ${(j.seniority || []).join(' ')}`, desc: stripHtml(j.excerpt).slice(0, 600), remote: true,
  }));
}
async function feedJobicy() {
  const data = await get('https://jobicy.com/api/v2/remote-jobs?count=200', { json: true });
  return (data.jobs || []).map(j => norm('jobicy', j.jobTitle, j.companyName, j.jobGeo, j.url, toDate(j.pubDate), {
    salaryNum: salaryAnnual(j.annualSalaryMax, j.annualSalaryMin), tags: `${(j.jobIndustry || []).join(' ')} ${(j.jobType || []).join(' ')}`, desc: stripHtml(j.jobExcerpt).slice(0, 600), remote: true,
  }));
}
async function feedArbeitnow() {
  const data = await get('https://www.arbeitnow.com/api/job-board-api', { json: true });
  return (data.data || []).map(j => norm('arbeitnow', j.title, j.company_name, j.location, j.url, toDate(j.created_at), {
    tags: `${(j.tags || []).join(' ')} ${(j.job_types || []).join(' ')}`, desc: stripHtml(j.description).slice(0, 600), remote: !!j.remote,
  }));
}
async function feedWwr() {
  const xml = await get('https://weworkremotely.com/remote-jobs.rss');
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map(it => {
    const tag = n => { const m = it.match(new RegExp(`<${n}>([\\s\\S]*?)<\\/${n}>`)); return m ? m[1].replace('<![CDATA[', '').replace(']]>', '').trim() : ''; };
    let title = tag('title'), company = '';
    if (title.includes(':')) [company, title] = [title.split(':')[0], title.split(':').slice(1).join(':')];
    return norm('weworkremotely', title, company, tag('region'), tag('link'), toDate(tag('pubDate')), { tags: tag('category'), desc: stripHtml(tag('description')).slice(0, 600), remote: true });
  });
}
async function feedWorkingnomads() {
  const data = await get('https://www.workingnomads.com/api/exposed_jobs/', { json: true });
  const tagStr = t => (Array.isArray(t) ? t.join(' ') : String(t || '').replace(/,/g, ' '));
  return (data || []).map(j => norm('workingnomads', j.title, j.company_name, j.location, j.url, toDate(j.pub_date), {
    tags: `${j.category_name || ''} ${tagStr(j.tags)}`, desc: stripHtml(j.description).slice(0, 600), remote: true,
  }));
}
async function feedHn() {
  const s = await get('https://hn.algolia.com/api/v1/search_by_date?query=%22who%20is%20hiring%22&tags=story,author_whoishiring&hitsPerPage=1', { json: true });
  const hit = (s.hits || [])[0];
  if (!hit) return [];
  const thread = await get(`https://hn.algolia.com/api/v1/items/${hit.objectID}`, { json: true, timeout: 30000 });
  const out = [];
  for (const k of thread.children || []) {
    const plain = stripHtml(k.text || '');
    if (!plain || !/\bremote\b/i.test(plain)) continue;
    const head = plain.slice(0, 300);
    const segs = head.split(/\s\|\s|\|/).map(x => x.trim()).filter(Boolean);
    const company = (segs[0] || '?').slice(0, 80);
    const title = (segs.slice(1).find(x => /engineer|developer|analyst|scientist|automation|data|ai|ml|swe|backend|full/i.test(x)) || segs[1] || head).slice(0, 120);
    const loc = segs.filter(x => /remote|anywhere|worldwide|global|\bus\b|\beu\b|europe|\buk\b|time ?zone|utc|est|pst/i.test(x)).join(' ').slice(0, 120) || 'remote';
    out.push(norm('hn_whoishiring', title, company, loc, `https://news.ycombinator.com/item?id=${k.id}`, toDate(k.created_at), { tags: `hn ${head}`, desc: plain.slice(0, 600), remote: true }));
  }
  return out;
}

async function feedLinkedin(days, deadline) {
  const tpr = days <= 1 ? 'r86400' : days <= 3 ? 'r259200' : 'r604800';
  const tasks = [];
  for (const loc of LINKEDIN_LOCATIONS) for (const kw of LINKEDIN_KEYWORDS) for (let p = 0; p < LINKEDIN_PAGES; p++) tasks.push({ loc, kw: loc === 'Pakistan' ? kw : `${kw} remote`, p });
  const out = [], seen = new Set();
  let i = 0;
  async function worker() {
    while (i < tasks.length && Date.now() < deadline) {
      const t = tasks[i++];
      const q = new URLSearchParams({ keywords: t.kw, location: t.loc, f_TPR: tpr, start: String(t.p * 10) });
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
        out.push(norm('linkedin', unescapeHtml(mTitle[1]), mComp ? unescapeHtml(mComp[1]) : '', mLoc ? unescapeHtml(mLoc[1]) : t.loc, url, mTime ? toDate(mTime[1]) : null, { tags: 'linkedin', remote: true }));
      }
    }
  }
  // 3 in flight: the guest endpoint starts returning empty pages when hammered harder.
  await Promise.all(Array.from({ length: 3 }, worker));
  return out;
}

const ATS_RX = /(?:boards\.greenhouse\.io|job-boards\.greenhouse\.io)\/([A-Za-z0-9_-]+)|jobs\.lever\.co\/([A-Za-z0-9_-]+)|jobs\.ashbyhq\.com\/([A-Za-z0-9_.-]+)/gi;
function harvestSlugs(jobs) {
  const found = new Map();
  for (const j of jobs) {
    const text = `${j.url} ${j.desc}`;
    let m;
    ATS_RX.lastIndex = 0;
    while ((m = ATS_RX.exec(text))) {
      const [gh, lv, ab] = [m[1], m[2], m[3]];
      const slug = (gh || lv || ab).toLowerCase().replace(/\/$/, '');
      if (['embed', 'jobs', 'api'].includes(slug)) continue;
      found.set(slug, { ats: gh ? 'greenhouse' : lv ? 'lever' : 'ashby', source: j.source });
    }
  }
  return found;
}
async function feedAts(boards, deadline) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < boards.length && Date.now() < deadline) {
      const b = boards[i++];
      try {
        if (b.ats === 'greenhouse') {
          const d = await get(`https://boards-api.greenhouse.io/v1/boards/${b.slug}/jobs`, { json: true, timeout: 10000 });
          for (const j of d.jobs || []) out.push(norm('ats_greenhouse', j.title, b.slug, (j.location || {}).name || '', j.absolute_url, toDate(j.updated_at || j.first_published), { tags: 'greenhouse' }));
        } else if (b.ats === 'lever') {
          const d = await get(`https://api.lever.co/v0/postings/${b.slug}?mode=json`, { json: true, timeout: 10000 });
          for (const j of Array.isArray(d) ? d : []) {
            const cats = j.categories || {};
            out.push(norm('ats_lever', j.text, b.slug, `${cats.location || ''}${j.workplaceType === 'remote' ? ' remote' : ''}`, j.hostedUrl, toDate(j.createdAt), { tags: `${cats.team || ''} ${cats.commitment || ''}`, remote: j.workplaceType === 'remote' }));
          }
        } else if (b.ats === 'ashby') {
          const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${b.slug}`, { json: true, timeout: 10000 });
          for (const j of d.jobs || []) out.push(norm('ats_ashby', j.title, b.slug, `${j.location || ''}${j.isRemote ? ' remote' : ''}`, j.jobUrl || j.applyUrl, toDate(j.publishedAt), { tags: `${j.department || ''} ${j.employmentType || ''}`, remote: !!j.isRemote }));
        }
      } catch { /* one dead board must not stop the run */ }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  return out;
}

// ---------- filters ----------
function locationOk(j) {
  const loc = j.location || '';
  if (j.source === 'arbeitnow' && !j.remote) return false;
  if (!loc.trim()) return true;
  if (FAST_LANE.test(loc)) return true;
  if (US_STATE.test(loc) || LOC_CLOSED.test(loc)) return false;
  return true;
}
export function lane(location) {
  const loc = location || '';
  if (/islamabad|rawalpindi/i.test(loc)) return 'PK-ISB';
  if (/pakistan/i.test(loc)) return 'PK';
  if (FAST_LANE.test(loc)) return 'Gulf';
  return 'World';
}
function score(j) {
  const blob = `${j.title} ${j.tags} ${j.desc}`;
  const head = `${j.title} ${j.tags}`;
  let s = 0;
  for (const [rx, w] of POSITIVE) if (rx.test(blob)) { s += w; if (rx.test(j.title)) s += 1; }
  for (const [rx, w] of NEGATIVE) if (rx.test(j.title)) s += w;
  if (!POSITIVE.some(([rx]) => rx.test(head))) s -= 3;
  const loc = j.location || '';
  if (/anywhere|worldwide|world wide|global/i.test(loc)) s += 2;
  if (FAST_LANE.test(loc)) s += 2;
  return s;
}
function shapeOf(j) {
  const t = `${j.title} ${j.tags} ${j.desc}`.toLowerCase();
  if (/contract|freelanc|part[- ]time|hourly/.test(t)) return 'contract';
  if (/full[- ]time|permanent/.test(t)) return 'full time';
  return 'unknown';
}

/**
 * Retire postings nobody applied to before they go stale. A job posted more than 14 days ago,
 * or first seen more than 10 days ago, is usually filled or closed, and leaving it in the queue
 * pushes fresh work down the list. Anything Anas acted on (applied, replied, interview, offer)
 * is never touched: that is his history.
 */
export async function expireOldJobs({ postedDays = 14, seenDays = 10 } = {}) {
  const admin = createAdminClient();
  const postedBefore = new Date(Date.now() - postedDays * 86400000).toISOString();
  const seenBefore = new Date(Date.now() - seenDays * 86400000).toISOString().slice(0, 10);
  const note = `[${new Date().toISOString().slice(0, 10)}] Expired automatically: postings this old are usually filled.`;

  const { data: byPosted } = await admin.from('job_leads').update({ status: 'expired', notes: note, updated_at: new Date().toISOString() })
    .in('status', ['new', 'shortlisted']).lt('posted_at', postedBefore).select('id');
  const { data: bySeen } = await admin.from('job_leads').update({ status: 'expired', notes: note, updated_at: new Date().toISOString() })
    .in('status', ['new', 'shortlisted']).lt('first_seen', seenBefore).select('id');
  return { expired: (byPosted?.length || 0) + (bySeen?.length || 0) };
}

/**
 * Run every source, filter, score, and upsert new rows into job_leads.
 * Existing rows are left untouched (their status is the operator's).
 */
export async function fetchAndStoreJobs({ days = 3, minScore = 3, linkedin = true, ats = true, budgetMs = 50000 } = {}) {
  const started = Date.now();
  const deadline = started + budgetMs;
  const admin = createAdminClient();
  const stats = {};
  const raw = [];

  const feeds = { remoteok: feedRemoteok, remotive: feedRemotive, himalayas: feedHimalayas, jobicy: feedJobicy, arbeitnow: feedArbeitnow, weworkremotely: feedWwr, workingnomads: feedWorkingnomads, hn: feedHn };
  const jobsList = [
    ...Object.entries(feeds).map(([name, fn]) => fn().then(r => ({ name, r })).catch(e => ({ name, err: e.message }))),
  ];
  if (linkedin) jobsList.push(feedLinkedin(days, deadline).then(r => ({ name: 'linkedin', r })).catch(e => ({ name: 'linkedin', err: e.message })));
  const { data: boardRows } = await admin.from('job_ats_boards').select('slug, ats');
  if (ats && boardRows && boardRows.length) jobsList.push(feedAts(boardRows, deadline).then(r => ({ name: `ats(${boardRows.length})`, r })).catch(e => ({ name: 'ats', err: e.message })));

  for (const res of await Promise.all(jobsList)) {
    if (res.err) { stats[res.name] = `FAILED ${res.err}`; continue; }
    stats[res.name] = res.r.length;
    raw.push(...res.r);
  }

  // teach the ATS table new boards
  const slugs = harvestSlugs(raw);
  const known = new Set((boardRows || []).map(b => b.slug));
  const newBoards = [...slugs.entries()].filter(([slug]) => !known.has(slug)).map(([slug, v]) => ({ slug, ats: v.ats, source: v.source }));
  if (newBoards.length) await admin.from('job_ats_boards').upsert(newBoards, { onConflict: 'slug', ignoreDuplicates: true });

  const now = Date.now();
  const dropped = { stale: 0, location: 0, pay: 0, score: 0, dupe: 0 };
  const seenKeys = new Set(), seenPairs = new Set();
  const rows = [];
  for (const j of raw) {
    if (!j.url || !j.title) continue;
    const key = j.url.split('?')[0].replace(/\/$/, '');
    const pair = (j.title + j.company).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenKeys.has(key) || (pair && seenPairs.has(pair))) { dropped.dupe++; continue; }
    seenKeys.add(key); seenPairs.add(pair);
    if (j.posted && (now - j.posted.getTime()) / 86400000 > days) { dropped.stale++; continue; }
    if (!locationOk(j)) { dropped.location++; continue; }
    if (j.salaryNum !== null && j.salaryNum < PAY_FLOOR_ANNUAL) { dropped.pay++; continue; }
    const sc = score(j);
    if (sc < minScore) { dropped.score++; continue; }
    rows.push({
      key, source: j.source, title: j.title.slice(0, 200), company: (j.company || '').slice(0, 160), location: (j.location || '').slice(0, 160),
      lane: lane(j.location), url: j.url, posted_at: j.posted ? j.posted.toISOString() : null, score: sc,
      salary_label: j.salaryNum ? `~$${Math.round(j.salaryNum).toLocaleString()}/yr` : 'unknown',
      shape: shapeOf(j), description: j.desc || null, status: 'new',
    });
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { data, error } = await admin.from('job_leads').upsert(chunk, { onConflict: 'key', ignoreDuplicates: true }).select('id');
    if (error) throw new Error(`job_leads upsert failed: ${error.message}`);
    inserted += (data || []).length;
  }
  return { ok: true, raw: raw.length, passed: rows.length, inserted, dropped, newBoards: newBoards.length, sources: stats, ms: Date.now() - started };
}
