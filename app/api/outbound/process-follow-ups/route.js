import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { processFollowUps } from '../../../../lib/outbound/sequencer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Manual trigger for the same pass the daily cron runs. */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await processFollowUps();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
