/**
 * Daily job fetch, triggered by Vercel Cron (see vercel.json), same code as the Refresh
 * button on /admin/jobs. Fills job_leads with fresh postings; never touches existing rows.
 */
import { NextResponse } from 'next/server';
import { fetchAndStoreJobs, expireOldJobs } from '../../../../lib/jobs/fetcher';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { draftForJobSafe } from '../../../../lib/jobs/drafter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Draft the best undrafted jobs so the flow page is never waiting on a model. */
async function draftTop(n, deadline) {
  const admin = createAdminClient();
  const { data } = await admin.from('job_leads').select('id')
    .in('status', ['new', 'shortlisted']).is('cover_note', null)
    .order('score', { ascending: false }).limit(n);
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
    const drafts = toDraft > 0 ? await draftTop(toDraft, Date.now() + 200000) : {};
    return NextResponse.json({ ...result, ...aged, ...drafts });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
