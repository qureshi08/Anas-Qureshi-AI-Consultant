// Insert one row into the live `prospects` table (the /admin Outbound pipeline),
// bypassing the browser entirely. Used by the prospect-sourcing skill so Anas
// never has to open /admin to log a qualified LinkedIn lead.
//
// Usage: node scripts/add-prospect.mjs '{"company":"...","contact_name":"...","notes":"..."}'
// Fields accepted (all optional except company): company, contact_name, role,
// website, linkedin, email, niche, source, status, notes, phone, address.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

function loadEnv(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

const env = loadEnv(envPath);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE in Website/.env.local');
  process.exit(1);
}

const raw = process.argv[2];
if (!raw) {
  console.error('Usage: node scripts/add-prospect.mjs \'{"company":"...","contact_name":"...","notes":"..."}\'');
  process.exit(1);
}

let row;
try {
  row = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON argument:', e.message);
  process.exit(1);
}

if (!row.company) {
  console.error('"company" is required');
  process.exit(1);
}

const ALLOWED = ['company', 'contact_name', 'role', 'website', 'linkedin', 'email', 'niche', 'source', 'status', 'notes', 'phone', 'address'];
const payload = {};
for (const key of ALLOWED) {
  if (row[key] !== undefined) payload[key] = row[key];
}
if (!payload.status) payload.status = 'new';
if (!payload.source) payload.source = 'linkedin-manual';

const res = await fetch(`${SUPABASE_URL}/rest/v1/prospects`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Insert failed (${res.status}):`, text);
  process.exit(1);
}
console.log('Inserted:', text);
