// Finds fresh tech companies for founder video pitches and adds them to video_pitches (status new).
// Source: Y Combinator's public company directory (same public Algolia search the Startups lane
// uses), last ~10 batches, active, with a website. Each company's own YC page gives the founders
// and, often, an email on the company's own domain. Only companies with such an email are kept,
// because the pitch goes out by email. A company already in video_pitches is never added twice.
// Usage: node scripts/pitch-source.mjs [--n 5]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(path.join(here, '..', '.env.local'), 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq > 0) env[t.slice(0, eq)] = t.slice(eq + 1).replace(/^"|"$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
const N = Number((process.argv.find(a => /^\d+$/.test(a))) || 5);

const YC_APP = '45BWZJ1SGC';
const YC_KEY = 'NzJmMWExZWYxYzY5OGYwN2VkYWM5YzRiM2VlNDFlM2I0ODU2YjQ2Yjg0MTFiNWE5NzY0NTMyZGI1OWEwMzVjY2FuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const PERSON = /^[A-Z][a-zA-Z'.]+(?:\s[A-Z][a-zA-Z'.]+){1,3}$/;
// software products that have a website to explain; skip hardware, biotech and similar
const SKIP = /hardware|robot|biotech|drug|therapeut|medical device|semiconductor|manufactur|aerospace|energy|climate hardware|agtech|pharma/i;

function batchScore(b) { const m = (b || '').match(/(Winter|Spring|Summer|Fall)\s+(\d{4})/i); if (!m) return -1; return Number(m[2]) * 4 + { winter: 0, spring: 1, summer: 2, fall: 3 }[m[1].toLowerCase()]; }
const now = new Date(), nowScore = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);

async function ycCompanies() {
  const out = [];
  for (let page = 0; page < 3; page++) {
    const res = await fetch(`https://${YC_APP}-dsn.algolia.net/1/indexes/YCCompany_production/query`, {
      method: 'POST', headers: { 'X-Algolia-API-Key': YC_KEY, 'X-Algolia-Application-Id': YC_APP, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '', hitsPerPage: 1000, page, filters: 'status:Active' }),
    });
    if (!res.ok) break;
    const d = await res.json(); out.push(...(d.hits || [])); if (page + 1 >= (d.nbPages || 1)) break;
  }
  return out;
}

async function detail(slug, domain) {
  const html = await (await fetch(`https://www.ycombinator.com/companies/${slug}`, { headers: UA })).text();
  const founders = [], seen = new Set(), rx = /text-xl font-bold">([^<]+)<[\s\S]{0,500}?linkedin\.com\/in\/([A-Za-z0-9_-]+)/g;
  let m; while ((m = rx.exec(html))) { const name = m[1].trim(); if (!PERSON.test(name) || seen.has(name)) continue; seen.add(name); founders.push({ name, linkedin: `https://www.linkedin.com/in/${m[2]}` }); }
  const erx = new RegExp(`[A-Za-z0-9._%+-]+@${domain.replace(/\./g, '\\.')}`, 'gi');
  const emails = [...new Set((html.match(erx) || []).filter(e => !/sentry|wixpress|noreply|no-reply/i.test(e)).map(e => e.toLowerCase()))];
  // a name goes with an email only when the email itself names that person; a wrong name is worse than none
  const email = emails[0] || null;
  const who = email ? founders.find(f => email.split('@')[0].includes(f.name.split(' ')[0].toLowerCase())) : null;
  return { founders, email, contact_name: who ? who.name : null, other: emails.slice(1) };
}

const { data: have } = await db.from('video_pitches').select('slug, website');
const haveSlugs = new Set((have || []).map(r => r.slug)), haveSites = new Set((have || []).map(r => r.website));
const pool = (await ycCompanies())
  .filter(h => h.slug && h.website && !haveSlugs.has(h.slug) && !haveSites.has(h.website))
  .filter(h => { const s = batchScore(h.batch); return s >= 0 && nowScore - s <= 10; })
  .filter(h => !SKIP.test(`${(h.industries || []).join(' ')} ${h.one_liner || ''}`))
  .sort((a, b) => batchScore(b.batch) - batchScore(a.batch) || Math.random() - .5);

const added = [];
for (const h of pool) {
  if (added.length >= N) break;
  let domain; try { domain = new URL(h.website).hostname.replace(/^www\./, ''); } catch { continue; }
  let d; try { d = await detail(h.slug, domain); } catch { continue; }
  if (!d.email) continue;
  const row = { slug: h.slug, company: h.name, website: h.website, one_liner: h.one_liner || null, source: `yc ${h.batch}`, founders: d.founders, contact_name: d.contact_name, contact_email: d.email, other_emails: d.other.join(', ') || null, status: 'new' };
  const { error } = await db.from('video_pitches').insert(row);
  if (!error) { added.push(row); console.log(`+ ${h.name} (${h.batch}) ${d.email}${d.contact_name ? ` [${d.contact_name}]` : ''}`); }
}
console.log(`added ${added.length} of ${N} wanted (pool ${pool.length})`);
