'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../../lib/supabase/admin';
import { getAdminUser } from '../../lib/requireAdmin';
import { fetchAndStoreJobs } from '../../lib/jobs/fetcher';
import { draftForJobSafe } from '../../lib/jobs/drafter';
import { findContactEmail } from '../../lib/jobs/contactFinder';

async function requireUser() {
  const user = await getAdminUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export async function refreshJobs() {
  await requireUser();
  try { await fetchAndStoreJobs({ days: 3, budgetMs: 45000 }); } catch { /* keep the page alive; the counts just do not change */ }
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}

export async function draftJob(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  await draftForJobSafe(id);
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
  revalidatePath(`/admin/jobs/${id}`);
}

// Drafts the highest scoring undrafted rows, a few at a time, so one click prepares a batch.
export async function draftBatch(formData) {
  await requireUser();
  const n = Math.min(Number(formData.get('n')) || 8, 12);
  const laneFilter = formData.get('lane') || null;
  const admin = createAdminClient();
  let q = admin.from('job_leads').select('id').in('status', ['new', 'shortlisted']).is('cover_note', null).order('score', { ascending: false }).limit(n);
  if (laneFilter) q = q.eq('lane', laneFilter);
  const { data } = await q;
  for (const row of data || []) {
    await draftForJobSafe(row.id);
  }
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}

export async function updateJob(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('job_leads').update({
    status: formData.get('status') || 'new',
    contact_name: formData.get('contact_name') || null,
    contact_url: formData.get('contact_url') || null,
    notes: formData.get('notes') || null,
    next_followup: formData.get('next_followup') || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
  revalidatePath(`/admin/jobs/${id}`);
}

export async function markApplied(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('job_leads').update({
    status: 'applied', applied_at: new Date().toISOString(), next_followup: plusDays(5), updated_at: new Date().toISOString(),
  }).eq('id', id);
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
  revalidatePath(`/admin/jobs/${id}`);
}

export async function setStatus(formData) {
  await requireUser();
  const id = formData.get('id');
  const status = formData.get('status');
  if (!id || !status) return;
  const admin = createAdminClient();
  const patch = { status, updated_at: new Date().toISOString() };
  if (status === 'applied') { patch.applied_at = new Date().toISOString(); patch.next_followup = plusDays(5); }
  if (['rejected', 'skipped', 'offer'].includes(status)) patch.next_followup = null;
  await admin.from('job_leads').update(patch).eq('id', id);
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}

/**
 * The one button flow on /admin/jobs: mark this job applied or skipped, then get the NEXT job
 * ready (drafted) so the next screen is never a blank card with a wait.
 */
export async function advanceJob(formData) {
  await requireUser();
  const id = formData.get('id');
  const action = formData.get('action');
  const admin = createAdminClient();
  if (id && action === 'applied') {
    await admin.from('job_leads').update({ status: 'applied', applied_at: new Date().toISOString(), next_followup: plusDays(5), updated_at: new Date().toISOString() }).eq('id', id);
  } else if (id && action === 'skip') {
    await admin.from('job_leads').update({ status: 'skipped', next_followup: null, updated_at: new Date().toISOString() }).eq('id', id);
  }
  await prepareCurrent();
  revalidatePath('/admin/jobs');
  revalidatePath('/admin/jobs/all');
}

/**
 * Keep a few jobs drafted ahead of Anas, not just the one on screen, so the next several
 * cards are ready the moment he presses the green button.
 */
export async function prepareCurrent(lookahead = 3) {
  const admin = createAdminClient();
  const { data } = await admin.from('job_leads').select('id, cover_note')
    .in('status', ['new', 'shortlisted']).is('cover_note', null)
    .order('score', { ascending: false }).limit(lookahead);
  for (const row of data || []) await draftForJobSafe(row.id);
}

export async function prepareCurrentAction() {
  await requireUser();
  await prepareCurrent(3);
  revalidatePath('/admin/jobs');
}

/** Draft the next 10 in one go, for a fresh day or after a model outage. */
export async function prepareBatchAction() {
  await requireUser();
  await prepareCurrent(10);
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}

/** Looks for a real published email at the company, saves it on the job. */
export async function findContact(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  const { data: job } = await admin.from('job_leads').select('company, url, notes').eq('id', id).single();
  if (!job) return;
  let patch = { updated_at: new Date().toISOString() };
  try {
    const { email, website, note } = await findContactEmail(job);
    patch.contact_email = email || null;
    const line = email
      ? `[${new Date().toISOString().slice(0, 10)}] email found: ${email}${note ? ` (${note})` : ''}`
      : `[${new Date().toISOString().slice(0, 10)}] no email found: ${note}${website ? ` (${website})` : ''}`;
    patch.notes = [job.notes, line].filter(Boolean).join('\n');
  } catch (e) {
    patch.notes = [job.notes, `[${new Date().toISOString().slice(0, 10)}] email search failed: ${(e.message || '').slice(0, 120)}`].filter(Boolean).join('\n');
  }
  await admin.from('job_leads').update(patch).eq('id', id);
  revalidatePath('/admin/jobs');
  revalidatePath(`/admin/jobs/${id}`);
}

/** Anas pastes an address he found himself. */
export async function saveContactEmail(formData) {
  await requireUser();
  const id = formData.get('id');
  const email = (formData.get('contact_email') || '').toString().trim().toLowerCase();
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('job_leads').update({ contact_email: email || null, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/jobs');
  revalidatePath(`/admin/jobs/${id}`);
}

export async function saveSettings(formData) {
  await requireUser();
  const admin = createAdminClient();
  const keys = ['notice_period', 'relocate_gulf', 'relocate_pk', 'salary_usd', 'salary_pkr', 'salary_gulf', 'daily_goal'];
  const rows = keys.map(k => ({ key: k, value: (formData.get(k) || '').toString().trim(), updated_at: new Date().toISOString() }));
  await admin.from('job_settings').upsert(rows, { onConflict: 'key' });
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}

export async function addJobByUrl(formData) {
  await requireUser();
  const url = (formData.get('url') || '').toString().trim();
  if (!url) return;
  const admin = createAdminClient();
  const key = url.split('?')[0].replace(/\/$/, '');
  const { data: existing } = await admin.from('job_leads').select('id').eq('key', key).maybeSingle();
  let id = existing?.id;
  if (!id) {
    const title = (formData.get('title') || '').toString().trim() || 'Pasted posting';
    const { data } = await admin.from('job_leads').insert({
      key, url, title, company: (formData.get('company') || '').toString().trim() || null,
      location: (formData.get('location') || '').toString().trim() || null, source: 'manual', score: 5, status: 'shortlisted',
    }).select('id').single();
    id = data?.id;
  }
  if (id) await draftForJobSafe(id);
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}
