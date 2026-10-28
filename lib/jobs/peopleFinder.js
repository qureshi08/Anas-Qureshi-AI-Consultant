/**
 * Finds real people at a target company from public search results (2026-10-28), so Anas never
 * researches who to message. Free, no keys: DuckDuckGo's HTML results for LinkedIn profiles.
 * Bing is no use here because it ignores the site: filter. A hit is kept only when its result
 * title names the company, because a loose match once returned a person whose first name was Riyadh.
 */
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };

async function get(url, timeout = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: 'no-store' });
    return res.ok ? await res.text() : '';
  } catch { return ''; }
  finally { clearTimeout(t); }
}

const clean = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/[‎‏]/g, '').replace(/\s+/g, ' ').trim();
const STOP = /\b(middle east|ksa|saudi|arabia|group|holding|company|technologies|solutions|inc|ltd|llc|ai by mckinsey)\b/gi;
// The words a result title must contain to count as this company: the company name minus filler.
export function companyKeys(company) {
  const base = String(company).replace(/\(.*?\)/g, ' ').replace(STOP, ' ');
  return (base.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2);
}

// Who is worth a referral chat: people doing the work or hiring for it, not sales or finance.
const GOOD_ROLE = /\b(ai|ml|machine learning|genai|llm|data|engineer|engineering|developer|software|solutions?|architect|forward deployed|technical|cto|head of|lead|manager|talent|recruit|hiring|hr|people)\b/i;
const BAD_ROLE = /\b(sales|account executive|business development|marketing|finance|accountant|student|intern)\b/i;

const QUERIES = company => [
  `site:linkedin.com/in "${company}" Saudi AI engineer`,
  `site:linkedin.com/in "${company}" Riyadh engineering manager`,
  `site:linkedin.com/in "${company}" Saudi talent acquisition`,
];

export async function findPeople(company, { max = 4, pauseMs = 1500 } = {}) {
  const keys = companyKeys(company);
  const found = new Map();
  for (const q of QUERIES(company)) {
    if (found.size >= max) break;
    const html = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
    for (const m of html.matchAll(/class="result__a"[^>]*href="[^"]*uddg=([^&"]+)[^>]*>([\s\S]*?)<\/a>/g)) {
      let url; try { url = decodeURIComponent(m[1]).split('?')[0]; } catch { continue; }
      if (!/linkedin\.com\/in\//.test(url) || found.has(url)) continue;
      const text = clean(m[2]).replace(/\s*\|\s*LinkedIn.*$/i, '');
      const [name, ...rest] = text.split(/\s+-\s+/);
      const title = rest.join(' - ').trim();
      const low = text.toLowerCase();
      if (!name || name.split(' ').length > 5 || !keys.length || !keys.some(k => low.includes(k))) continue;
      if (!GOOD_ROLE.test(title) || BAD_ROLE.test(title)) continue;
      found.set(url, { name: name.trim(), title: title || company, url: url.replace(/^https?:\/\/[a-z]{2}\./, 'https://www.') });
      if (found.size >= max) break;
    }
    await new Promise(r => setTimeout(r, pauseMs));
  }
  return [...found.values()];
}
