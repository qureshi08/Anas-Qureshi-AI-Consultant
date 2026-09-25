// Clears view counts on one pitch (for example after Anas or Claude opened the page to test it).
// Usage: node scripts/reset-pitch-views.mjs <slug>
import { readFileSync } from 'node:fs'; import { fileURLToPath } from 'node:url'; import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
const env = {}; for (const l of readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local'), 'utf8').split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e)] = t.slice(e + 1).replace(/^"|"$/g, ''); }
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
const { data } = await db.from('video_pitches').update({ views: 0, first_viewed_at: null, last_viewed_at: null }).eq('slug', process.argv[2]).select('slug, views, status');
console.log(data);
