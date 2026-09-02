/**
 * Daily job fetch, triggered by Vercel Cron (see vercel.json), same code as the Refresh
 * button on /admin/jobs. Fills job_leads with fresh postings; never touches existing rows.
 */
import { NextResponse } from 'next/server';
import { fetchAndStoreJobs } from '../../../../lib/jobs/fetcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const days = Number(new URL(request.url).searchParams.get('days')) || 3;
    const result = await fetchAndStoreJobs({ days, budgetMs: 50000 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
