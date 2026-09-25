'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../../lib/supabase/admin';
import { getAdminUser } from '../../lib/requireAdmin';
import { sendJobEmail } from '../../lib/jobs/mailSender';

async function requireUser() {
  const user = await getAdminUser();
  if (!user) throw new Error('Unauthorized');
}
const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

/**
 * One click send of a founder video pitch from Anas's own inbox. The email carries the link to
 * /v/<slug>, never the file. Only on success is the row marked sent (with a day 4 follow up);
 * a failure is written to notes instead. Same send guard as the startup lane: the address must be
 * on the company's own domain, or it is refused.
 */
export async function sendPitchNow(formData) {
  await requireUser();
  const id = formData.get('id');
  const admin = createAdminClient();
  const { data: p } = await admin.from('video_pitches').select('*').eq('id', id).single();
  if (!p || !p.contact_email || !p.email_body) return;
  let domain = '';
  try { domain = new URL(p.website).hostname.replace(/^www\./, '').toLowerCase(); } catch { domain = ''; }
  const emailDomain = (p.contact_email.split('@')[1] || '').toLowerCase();
  if (domain && emailDomain !== domain && !emailDomain.endsWith(`.${domain}`)) {
    await admin.from('video_pitches').update({ notes: [p.notes, `[${stamp()}] SEND BLOCKED: ${p.contact_email} is not on ${domain}.`].filter(Boolean).join('\n'), updated_at: new Date().toISOString() }).eq('id', id);
    revalidatePath('/admin/pitches'); return;
  }
  const r = await sendJobEmail({ to: p.contact_email, subject: p.email_subject || `A short video for ${p.company}`, body: p.email_body });
  if (r.success) {
    await admin.from('video_pitches').update({ status: 'sent', sent_at: new Date().toISOString(), next_followup: plusDays(4), notes: [p.notes, `[${stamp()}] Emailed ${p.contact_email}`].filter(Boolean).join('\n'), updated_at: new Date().toISOString() }).eq('id', id);
  } else {
    await admin.from('video_pitches').update({ notes: [p.notes, `[${stamp()}] SEND FAILED: ${(r.error || '').slice(0, 200)}`].filter(Boolean).join('\n'), updated_at: new Date().toISOString() }).eq('id', id);
  }
  revalidatePath('/admin/pitches');
}

export async function setPitchStatus(formData) {
  await requireUser();
  const id = formData.get('id'), status = formData.get('status');
  if (!id || !status) return;
  const admin = createAdminClient();
  const patch = { status, updated_at: new Date().toISOString() };
  if (status === 'sent') { patch.sent_at = new Date().toISOString(); patch.next_followup = plusDays(4); }
  if (['replied', 'skipped'].includes(status)) patch.next_followup = null;
  await admin.from('video_pitches').update(patch).eq('id', id);
  revalidatePath('/admin/pitches');
}

export async function savePitchEmail(formData) {
  await requireUser();
  const id = formData.get('id');
  const admin = createAdminClient();
  const email = (formData.get('contact_email') || '').toString().trim().toLowerCase();
  await admin.from('video_pitches').update({ contact_email: email || null, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/pitches');
}
