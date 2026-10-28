// Grades every target company's fit and fills job_plan_suggestions with real people found by
// lib/jobs/peopleFinder.js. Saves each company's people as soon as they are found (crash safe).
// Usage: node scripts/seed-plan-people.mjs [--fit-only]
import { readFileSync } from 'node:fs';
import { findPeople } from '../lib/jobs/peopleFinder.js';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const api = (path, opts = {}) => fetch(`${URL_}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });

// Fit from the 2026-10-27 research reports: 3 strong (hands on, reachable seniority, no Arabic needed),
// 2 good (Arabic required, more years, or posting unconfirmed), 1 stretch (senior, presales or internship).
const FIT = {
  3: { note: 'Strong fit: hands on AI role at a reachable level, no Arabic required', ids: ['sap', 'pwc-middle-east', 'cohere', 'softserve', 'foodics', 'fikrah-ventures', 'opxo-group', 'mozn', 'master-works-masterworks'] },
  2: { note: 'Good fit, with a catch: Arabic required, more years asked, or the posting is unconfirmed', ids: ['deloitte', 'datarobot', 'intel', 'telnyx', 'boston-consulting-group-bcg-platinion', 'sarj', 'unifonic', 'lucidya', 'elm', 'tawantech', 'ninja-ananinja', 'omniops', 'accenture-middle-east'] },
  1: { note: 'Stretch: senior, presales heavy or an internship', ids: ['salesforce', 'uipath', 'devoteam', 'tata-consultancy-services', 'amazon-web-services', 'ntt-data', 'quantumblack-ai-by-mckinsey', 'ibm', 'alibaba-cloud', 'northbay-solutions', 'salla', 'innovationteam', 'coorb', 'saudi-azm', 'takamol-holding', 'lean-technologies'] },
};
for (const [fit, { note, ids }] of Object.entries(FIT)) {
  const r = await api(`job_plan_companies?id=in.(${ids.join(',')})`, { method: 'PATCH', body: JSON.stringify({ fit: Number(fit), fit_note: note }), headers: { Prefer: 'return=representation' } });
  console.log(`fit ${fit}:`, (await r.json()).length, 'companies');
}
if (process.argv.includes('--fit-only')) process.exit(0);

const cos = await (await api('job_plan_companies?select=id,name,fit&order=fit.desc')).json();
let total = 0;
for (const c of cos) {
  const people = await findPeople(c.name);
  if (people.length) {
    const rows = people.map(p => ({ company_id: c.id, company: c.name, name: p.name, title: p.title, url: p.url }));
    const r = await api('job_plan_suggestions?on_conflict=url', { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'resolution=ignore-duplicates' } });
    if (!r.ok) console.log('  save failed', c.name, r.status, (await r.text()).slice(0, 200));
  }
  total += people.length;
  console.log(`${c.name} (fit ${c.fit}): ${people.length}`, people.map(p => `${p.name} | ${p.title}`).join(' ; '));
}
console.log('done, people found:', total);
