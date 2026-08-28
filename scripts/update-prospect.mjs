// Update an existing row in the live `prospects` table (the /admin Outbound pipeline)
// by company name, bypassing the browser entirely. Pairs with add-prospect.mjs.
//
// Usage: node scripts/update-prospect.mjs '{"company":"...","contact_name":"...","status":"replied","note":"..."}'
// - company: required unless "id" is given, used to find the row (case-insensitive exact match)
// - contact_name: optional, narrows the match if company alone matches more than one row
// - id: optional, exact row id, use this instead of company/contact_name when company+contact_name are ambiguous (e.g. deduping)
// - status: optional, new | request_sent_no_note | request_sent_with_note | connected | dm_sent | dm_read | replied | call | won | lost (see Website/app/admin/stages.js)
// - note: optional, APPENDED to the notes' activity-log section with a dated separator (never overwrites history)
// - draft: optional, sets the DM Draft box (the ready-to-send message text), overwrites any prior draft
// - role, website, linkedin, email, niche: optional, overwrite directly if given
//
// `prospects.notes` is ONE text column that the /admin UI splits into three logical
// parts (plain notes, DM draft, activity log) via internal markers -- there is no
// separate `draft_message` column (a migration file for one exists but was never run
// and the UI doesn't read it anyway). Corrected 2026-08-18 after `note` was appended
// as raw text and landed in the wrong place instead of the DM Draft box. See
// Website/lib/prospectNotes.js for the real parsing logic, mirrored here.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DRAFT_MARKER = '\n\n---DM DRAFT---\n';
const LOG_MARKER = '\n\n---ACTIVITY LOG---\n';
function parseNotes(raw) {
  const text = raw || '';
  const [beforeLog, log = ''] = text.split(LOG_MARKER);
  const [notes = '', draft = ''] = beforeLog.split(DRAFT_MARKER);
  return { notes: notes.trim(), draft: draft.trim(), log: log.trim() };
}
function combineNotes({ notes, draft, log }) {
  let out = (notes || '').trim();
  if (draft && draft.trim()) out += DRAFT_MARKER + draft.trim();
  if (log && log.trim()) out += LOG_MARKER + log.trim();
  return out;
}

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
  console.error('Usage: node scripts/update-prospect.mjs \'{"company":"...","status":"replied","note":"..."}\'');
  process.exit(1);
}

let input;
try {
  input = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON argument:', e.message);
  process.exit(1);
}

if (!input.company && !input.id) {
  console.error('"company" (or "id") is required to find the row');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
};

const params = new URLSearchParams();
if (input.id) {
  params.set('id', `eq.${input.id}`);
} else {
  params.set('company', `ilike.${input.company}`);
  if (input.contact_name) params.set('contact_name', `ilike.${input.contact_name}`);
}
params.set('select', '*');
params.set('order', 'created_at.desc');

const findRes = await fetch(`${SUPABASE_URL}/rest/v1/prospects?${params.toString()}`, { headers });
const rows = await findRes.json();

if (!findRes.ok) {
  console.error(`Lookup failed (${findRes.status}):`, rows);
  process.exit(1);
}
if (rows.length === 0) {
  console.error(`No prospect found matching company "${input.company}"${input.contact_name ? ` / contact "${input.contact_name}"` : ''}.`);
  process.exit(1);
}
if (rows.length > 1) {
  console.error(`Ambiguous: ${rows.length} prospects match "${input.company}". Re-run with "contact_name" to narrow it down. Candidates:`);
  for (const r of rows) console.error(`  - id=${r.id} contact_name=${r.contact_name} status=${r.status}`);
  process.exit(1);
}

const existing = rows[0];
const DIRECT_FIELDS = ['role', 'website', 'linkedin', 'email', 'niche', 'status', 'phone', 'address'];
const patch = {};
for (const key of DIRECT_FIELDS) {
  if (input[key] !== undefined) patch[key] = input[key];
}

if (input.note || input.draft !== undefined) {
  const parsed = parseNotes(existing.notes);
  if (input.draft !== undefined) parsed.draft = input.draft;
  if (input.note) {
    const dateTag = new Date().toISOString().slice(0, 10);
    parsed.log = parsed.log ? `${parsed.log}\n[${dateTag}] ${input.note}` : `[${dateTag}] ${input.note}`;
  }
  patch.notes = combineNotes(parsed);
}

if (Object.keys(patch).length === 0) {
  console.error('Nothing to update: pass at least one of status, note, draft, role, website, linkedin, email, niche, phone, address.');
  process.exit(1);
}

const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/prospects?id=eq.${existing.id}`, {
  method: 'PATCH',
  headers: { ...headers, Prefer: 'return=representation' },
  body: JSON.stringify(patch),
});

const text = await updateRes.text();
if (!updateRes.ok) {
  console.error(`Update failed (${updateRes.status}):`, text);
  process.exit(1);
}
console.log('Updated:', text);
