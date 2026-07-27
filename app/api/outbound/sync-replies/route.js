import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { scanForReplies } from '../../../../lib/outbound/replyScanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await scanForReplies();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
