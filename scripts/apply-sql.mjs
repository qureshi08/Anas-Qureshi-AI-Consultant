// Runs one .sql file against the live Supabase project through the Management API, so schema
// changes (new tables, buckets) do not need a trip to the SQL Editor.
// Needs SUPABASE_ACCESS_TOKEN (personal access token) and NEXT_PUBLIC_SUPABASE_URL in .env.local.
// Usage: node scripts/apply-sql.mjs supabase/video_pitches.sql
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(path.join(here, '..', '.env.local'), 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq > 0) env[t.slice(0, eq)] = t.slice(eq + 1).replace(/^"|"$/g, '');
}
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/apply-sql.mjs <file.sql>'); process.exit(1); }
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: readFileSync(path.resolve(file), 'utf8') }),
});
console.log(res.status, (await res.text()).slice(0, 400));
