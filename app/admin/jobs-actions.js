'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../../lib/supabase/admin';
import { getAdminUser } from '../../lib/requireAdmin';
import { fetchAndStoreJobs } from '../../lib/jobs/fetcher';
import { draftForJob } from '../../lib/jobs/drafter';

async function requireUser() {
  const user = await getAdminUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export async function refreshJobs() {
  await requireUser();
  await fetchAndStoreJobs({ days: 3, budgetMs: 45000 });
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}

export async function draftJob(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  await draftForJob(id);
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
    try { await draftForJob(row.id); } catch { /* keep going, the row stays undrafted */ }
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

/** Draft the job that will be shown next, if it has no copy yet. Safe to call any time. */
export async function prepareCurrent() {
  const admin = createAdminClient();
  const { data } = await admin.from('job_leads').select('id, cover_note').in('status', ['new', 'shortlisted']).order('score', { ascending: false }).limit(1);
  const next = (data || [])[0];
  if (next && !next.cover_note) {
    try { await draftForJob(next.id); } catch { /* the card shows a Prepare button if this failed */ }
  }
}

export async function prepareCurrentAction() {
  await requireUser();
  await prepareCurrent();
  revalidatePath('/admin/jobs');
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
  if (id) { try { await draftForJob(id); } catch { /* shows undrafted, Draft button retries */ } }
  revalidatePath('/admin/jobs'); revalidatePath('/admin/jobs/all');
}
