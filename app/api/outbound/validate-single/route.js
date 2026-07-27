import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { validateEmail } from '../../../../lib/outbound/validator';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  try {
    const result = await validateEmail(email);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
