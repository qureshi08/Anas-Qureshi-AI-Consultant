/**
 * Finds a real, published email address to send the application to, for one job.
 * Free, no API keys: find the company's own website, then read the pages where companies
 * publish addresses (contact, about, careers) and keep what is actually written there.
 * Never guesses an address pattern, because a guessed address bounces and burns the sender.
 */
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };

const BAD_DOMAINS = /linkedin|indeed|glassdoor|jobicy|remoteok|remotive|himalayas|weworkremotely|workingnomads|arbeitnow|ycombinator|greenhouse|lever|ashby|wikipedia|facebook|twitter|x\.com|instagram|youtube|crunchbase|bloomberg|zoominfo|rocketreach|apollo|signalhire/i;
const JUNK_EMAIL = /\.(png|jpg|jpeg|gif|webp|svg|css|js)$|sentry|wixpress|example\.com|yourdomain|@email\.com|@info\.com|@domain\.com|@sentry|noreply|no-reply|donotreply/i;
// For a job application these role inboxes are the RIGHT target, unlike in sales outreach.
const GOOD_LOCAL = /^(careers?|jobs?|hr|recruit(ing|ment)?|talent|people|hiring|apply|work|join|info|hello|contact|team|admin|office)$/i;

async function get(url, timeout = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: 'follow', cache: 'no-store' });
    if (!res.ok) return '';
    return await res.text();
  } catch { return ''; }
  finally { clearTimeout(t); }
}

/** Company website from a search engine that answers server side without a key. */
async function findWebsite(company, jobUrl) {
  try {
    const u = new URL(jobUrl);
    if (!BAD_DOMAINS.test(u.hostname)) return `${u.protocol}//${u.hostname}`;
  } catch { /* keep going */ }
  if (!company) return '';
  const html = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${company} official website`)}`, 10000);
  const hrefs = [...html.matchAll(/uddg=([^&"]+)/g)].map(m => { try { return decodeURIComponent(m[1]); } catch { return ''; } });
  for (const href of hrefs) {
    try {
      const h = new URL(href);
      if (!BAD_DOMAINS.test(h.hostname)) return `${h.protocol}//${h.hostname}`;
    } catch { /* next */ }
  }
  return '';
}

function harvest(html) {
  const found = new Set();
  const text = (html || '').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d));
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    const e = m[0].toLowerCase().replace(/^mailto:/, '');
    if (!JUNK_EMAIL.test(e)) found.add(e);
  }
  return [...found];
}

/** Returns { email, website, note }. email is '' when nothing is published. */
export async function findContactEmail({ company, url }) {
  const site = await findWebsite(company, url);
  if (!site) return { email: '', website: '', note: 'could not find the company website' };

  const paths = ['', '/contact', '/contact-us', '/about', '/careers', '/jobs', '/company'];
  const pages = await Promise.all(paths.map(p => get(site + p)));
  const emails = [...new Set(pages.flatMap(harvest))];
  if (!emails.length) return { email: '', website: site, note: 'website found, no address published on it' };

  const host = new URL(site).hostname.replace(/^www\./, '');
  const onDomain = emails.filter(e => e.split('@')[1] === host);
  const pool = onDomain.length ? onDomain : emails;
  // careers@ and hr@ first, then anything else on the company's own domain.
  const ranked = pool.sort((a, b) => {
    const score = e => (GOOD_LOCAL.test(e.split('@')[0]) ? 0 : 1);
    return score(a) - score(b) || a.length - b.length;
  });
  return { email: ranked[0], website: site, note: onDomain.length ? '' : 'address is not on the company domain, check it before sending' };
}
