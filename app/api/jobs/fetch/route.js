/**
 * Daily job fetch, triggered by Vercel Cron (see vercel.json), same code as the Refresh
 * button on /admin/jobs. Fills job_leads with fresh postings; never touches existing rows.
 */
import { NextResponse } from 'next/server';
import { fetchAndStoreJobs, expireOldJobs } from '../../../../lib/jobs/fetcher';
import { fetchAndStoreTraining } from '../../../../lib/jobs/trainingFetcher';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { draftForJobSafe } from '../../../../lib/jobs/drafter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Draft the best undrafted jobs so the flow page is never waiting on a model. */
async function draftTop(n, deadline, training = false) {
  const admin = createAdminClient();
  let q = admin.from('job_leads').select('id')
    .in('status', ['new', 'shortlisted']).is('cover_note', null)
    .order('score', { ascending: false }).limit(n);
  q = training ? q.eq('lane', 'Training') : q.neq('lane', 'Training');
  const { data } = await q;
  let done = 0, failed = 0;
  for (const row of data || []) {
    if (Date.now() > deadline) break;
    const r = await draftForJobSafe(row.id);
    if (r.ok) done++; else failed++;
  }
  return { drafted: done, failedDrafts: failed };
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const params = new URL(request.url).searchParams;
    const days = Number(params.get('days')) || 3;
    const toDraft = params.has('draft') ? Number(params.get('draft')) : 12;
    const aged = await expireOldJobs();
    const result = await fetchAndStoreJobs({ days, budgetMs: 50000 });
    let training = {};
    try { training = { training: await fetchAndStoreTraining({ budgetMs: 40000 }) }; } catch (e) { training = { training: { ok: false, message: e.message } }; }
    const drafts = toDraft > 0 ? await draftTop(toDraft, Date.now() + 130000) : {};
    const trainDrafts = toDraft > 0 ? await draftTop(6, Date.now() + 60000, true) : {};
    return NextResponse.json({ ...result, ...aged, ...drafts, ...training, trainingDrafted: trainDrafts.drafted });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
