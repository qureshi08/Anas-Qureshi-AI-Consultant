import { NextResponse } from 'next/server';
import { getAdminUser } from '../../../../lib/requireAdmin';
import { scanForReplies } from '../../../../lib/outbound/replyScanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await scanForReplies();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
