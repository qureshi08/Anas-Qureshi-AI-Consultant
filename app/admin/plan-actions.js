'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../../lib/supabase/admin';
import { getAdminUser } from '../../lib/requireAdmin';
import { findPeople } from '../../lib/jobs/peopleFinder';
import { draftReferralMessage } from '../../lib/jobs/referralDrafter';

// Track 1 referrals-first plan (2026-10-27). Writes for /admin/jobs/plan: companies get a
// Want and Reach rating, contacts get one date per stage so the week can be counted.
async function requireUser() {
  if (!(await getAdminUser())) throw new Error('Unauthorized');
}

const today = () => new Date().toISOString().slice(0, 10);
const STAGES = ['replied', 'call', 'referral', 'interview', 'offer'];
const rating = v => (['1', '2', '3'].includes(v) ? Number(v) : null);
const done = () => revalidatePath('/admin/jobs/plan');

export async function rateCompany(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  await createAdminClient().from('job_plan_companies')
    .update({ want: rating(formData.get('want')), reach: rating(formData.get('reach')) }).eq('id', id);
  done();
}

export async function addContact(formData) {
  await requireUser();
  const name = (formData.get('name') || '').trim();
  if (!name) return;
  await createAdminClient().from('job_plan_contacts').insert({
    name,
    company: formData.get('company') || null,
    tie: formData.get('tie') || null,
    link: (formData.get('link') || '').trim() || null,
    contacted_on: today(),
  });
  done();
}

// Clicking a stage stamps today; clicking a stamped stage clears it (a misclick undo).
export async function toggleStage(formData) {
  await requireUser();
  const id = formData.get('id');
  const stage = formData.get('stage');
  if (!id || !STAGES.includes(stage)) return;
  const col = `${stage}_on`;
  const admin = createAdminClient();
  const { data } = await admin.from('job_plan_contacts').select(col).eq('id', id).single();
  if (!data) return;
  await admin.from('job_plan_contacts').update({ [col]: data[col] ? null : today() }).eq('id', id);
  done();
}

export async function markFollowedUp(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  await createAdminClient().from('job_plan_contacts').update({ followed_up_on: today() }).eq('id', id);
  done();
}

export async function deleteContact(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  await createAdminClient().from('job_plan_contacts').delete().eq('id', id);
  done();
}

/* ---- Click and go referrals (2026-10-28): the site finds the people and writes the messages. ---- */

export async function markRequested(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  await createAdminClient().from('job_plan_suggestions').update({ status: 'requested', requested_on: today() }).eq('id', id);
  done();
}

export async function skipSuggestion(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  await createAdminClient().from('job_plan_suggestions').update({ status: 'skipped' }).eq('id', id);
  done();
}

// Sending the drafted message is the moment a person counts as contacted for the weekly target.
export async function markMessaged(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  const { data: s } = await admin.from('job_plan_suggestions').select('*').eq('id', id).single();
  if (!s) return;
  await admin.from('job_plan_contacts').insert({ name: s.name, company: s.company, tie: s.title, link: s.url, contacted_on: today() });
  await admin.from('job_plan_suggestions').update({ status: 'messaged' }).eq('id', id);
  done();
}

export async function redraftMessage(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  const { data: s } = await admin.from('job_plan_suggestions').select('*, job_plan_companies(role, why)').eq('id', id).single();
  if (!s) return;
  try {
    const message = await draftReferralMessage({ name: s.name, title: s.title, company: s.company, role: s.job_plan_companies?.role, why: s.job_plan_companies?.why });
    await admin.from('job_plan_suggestions').update({ message }).eq('id', id);
  } catch { /* the page shows the draft is missing and offers this button again */ }
  done();
}

export async function findMorePeople(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  const { data: c } = await admin.from('job_plan_companies').select('id, name').eq('id', id).single();
  if (!c) return;
  const people = await findPeople(c.name, { max: 4, pauseMs: 800 });
  if (people.length) {
    await admin.from('job_plan_suggestions').upsert(people.map(p => ({ company_id: c.id, company: c.name, ...p })), { onConflict: 'url', ignoreDuplicates: true });
  }
  done();
}
