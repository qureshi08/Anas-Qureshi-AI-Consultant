/**
 * Draft the cover note and message for one job_leads row. Used by the admin page's server
 * actions indirectly (same lib), exposed here for scripts and for a future "draft the top N
 * overnight" cron. Gated by CRON_SECRET or an allowed admin session.
 */
import { NextResponse } from 'next/server';
import { draftForJob } from '../../../../lib/jobs/drafter';
import { getAdminUser } from '../../../../lib/requireAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  const viaSecret = secret && request.headers.get('authorization') === `Bearer ${secret}`;
  if (!viaSecret && !(await getAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const result = await draftForJob(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
