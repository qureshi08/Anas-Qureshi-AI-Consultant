'use server';

import { createAdminClient } from '../../../lib/supabase/admin';

/**
 * A founder replies from their pitch page. Replaces the old mailto button, which opened whatever desktop mail app
 * the visitor had (or nothing, for Gmail-in-browser users). The reply lands in inbound_leads (shown on
 * /admin/inbound, tagged with the company) and marks the pitch as replied on /admin/pitches.
 */
export async function sendPitchReply(prev, formData) {
  const slug = String(formData.get('slug') || '').slice(0, 80);
  const email = String(formData.get('email') || '').trim().slice(0, 200);
  const message = String(formData.get('message') || '').trim().slice(0, 4000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please add an email I can reply to.' };
  if (message.length < 2) return { ok: false, error: 'Please write a short message.' };

  const admin = createAdminClient();
  const { data: p } = await admin.from('video_pitches').select('id, company, notes').eq('slug', slug).maybeSingle();
  if (!p) return { ok: false, error: 'Something went wrong. Email me at muhammadanasq@gmail.com.' };

  const { error } = await admin.from('inbound_leads').insert({ email, task: `[Video pitch reply: ${p.company}] ${message}` });
  if (error) return { ok: false, error: 'Something went wrong. Email me at muhammadanasq@gmail.com.' };

  const now = new Date().toISOString();
  await admin.from('video_pitches').update({
    status: 'replied',
    notes: `${now.slice(0, 10)}: replied from the video page (${email}): ${message.slice(0, 300)}` + (p.notes ? '\n' + p.notes : ''),
    updated_at: now,
  }).eq('id', p.id);
  return { ok: true };
}
