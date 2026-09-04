/**
 * Finds a real, published email address to send the application to, for one job.
 * Free, no API keys: find the company's own website, then read the pages where companies
 * publish addresses (contact, about, careers) and keep what is actually written there.
 * Never guesses an address pattern, because a guessed address bounces and burns the sender.
 */
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };

const BAD_DOMAINS = /linkedin|indeed|glassdoor|jobicy|remoteok|remotive|himalayas|weworkremotely|workingnomads|arbeitnow|ycombinator|greenhouse|lever|ashby|wikipedia|facebook|twitter|x\.com|instagram|youtube|crunchbase|bloomberg|zoominfo|rocketreach|apollo|signalhire|bing\.com|duckduckgo|google\.|yahoo\.|search\.marcia/i;
const JUNK_EMAIL = /\.(png|jpg|jpeg|gif|webp|svg|css|js)$|sentry|wixpress|example\.com|yourdomain|@email\.com|@info\.com|@domain\.com|@sentry|noreply|no-reply|donotreply/i;
// Marketing pages are full of demo addresses. These are never a real person to write to.
const SAMPLE_EMAIL = /@(acme|example|test|demo|sample|company|yourcompany|mycompany|domain|email)\./i;
const SAMPLE_LOCAL = /^(j\.?smith|john\.?doe|jane\.?doe|johndoe|janedoe|firstname|lastname|yourname|your|name|user|test|demo|sample|email)$/i;
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

const tokens = company => String(company || '').toLowerCase().replace(/\b(l\.?l\.?c|ltd|limited|inc|gmbh|pvt|private|solutions|technologies|group|company|co)\b/g, ' ').match(/[a-z0-9]+/g) || [];

/** Does this page really belong to the company, or did the search hand us a random site? */
async function looksLikeCompany(origin, company) {
  const html = await get(origin, 10000);
  if (!html) return false;
  const t = tokens(company).filter(w => w.length > 2);
  if (!t.length) return true;
  const body = html.toLowerCase();
  const hits = t.filter(w => body.includes(w)).length;
  // One distinctive word is enough for a one word brand, otherwise ask for two.
  return hits >= Math.min(t.length === 1 ? 1 : 2, t.length);
}

/**
 * Company website, in order of reliability: the posting's own host, then two search engines,
 * then likely domains built from the company name. Every candidate is opened and checked for
 * the company name before it is trusted, so a wrong site cannot leak a wrong address.
 */
async function findWebsite(company, jobUrl) {
  try {
    const u = new URL(jobUrl);
    if (!BAD_DOMAINS.test(u.hostname)) return `${u.protocol}//${u.hostname}`;
  } catch { /* keep going */ }
  if (!company) return '';

  // EVERY candidate must prove itself. Search engines return junk often enough that trusting
  // the first hit produced a Zhihu address for a Dubai startup in testing. A wrong address is
  // worse than none, so a page has to actually mention the company before we read it.
  const searched = [];
  const q = encodeURIComponent(`${company} official website`);
  const ddg = await get(`https://html.duckduckgo.com/html/?q=${q}`, 10000);
  for (const m of ddg.matchAll(/uddg=([^&"]+)/g)) {
    try { searched.push(new URL(decodeURIComponent(m[1]))); } catch { /* next */ }
  }
  if (!searched.length) {
    const bing = await get(`https://www.bing.com/search?q=${q}&format=rss`, 10000);
    // Only the links inside <item>, never the feed's own <link>, which points back at Bing.
    for (const item of bing.match(/<item>[\s\S]*?<\/item>/g) || []) {
      const m = item.match(/<link>([^<]+)<\/link>/);
      if (m) { try { searched.push(new URL(m[1])); } catch { /* next */ } }
    }
  }
  const slug = tokens(company).join('');
  const dashed = tokens(company).join('-');
  const guesses = [`${slug}.com`, `${slug}.ai`, `${slug}.io`, `${slug}.co`, `${dashed}.com`].map(h => `https://${h}`);
  const fromSearch = searched.filter(c => !BAD_DOMAINS.test(c.hostname)).map(c => `${c.protocol}//${c.hostname}`);

  const seen = new Set();
  for (const origin of [...fromSearch, ...guesses]) {
    if (seen.has(origin) || seen.size >= 8) continue;
    seen.add(origin);
    if (await looksLikeCompany(origin, company)) return origin;
  }
  return '';
}

function harvest(html) {
  const found = new Set();
  const text = (html || '').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d));
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    const e = m[0].toLowerCase().replace(/^mailto:/, '');
    if (JUNK_EMAIL.test(e) || SAMPLE_EMAIL.test(e) || SAMPLE_LOCAL.test(e.split('@')[0])) continue;
    found.add(e);
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

  // Only addresses on the company's own domain. Anything else on a marketing page belongs to
  // their agency, a demo, or another business, and sending there wastes the application.
  const host = new URL(site).hostname.replace(/^www\./, '');
  const onDomain = emails.filter(e => {
    const d = e.split('@')[1];
    return d === host || d.endsWith(`.${host}`);
  });
  if (!onDomain.length) return { email: '', website: site, note: `website found, but no address on ${host}` };

  const ranked = onDomain.sort((a, b) => {
    const rank = e => (GOOD_LOCAL.test(e.split('@')[0]) ? 0 : 1);
    return rank(a) - rank(b) || a.length - b.length;
  });
  return { email: ranked[0], website: site, note: '' };
}
