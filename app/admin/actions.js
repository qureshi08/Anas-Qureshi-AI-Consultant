'use server';

import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';
import { revalidatePath } from 'next/cache';

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function createCampaign(formData) {
  await requireUser();
  const name = formData.get('name');
  const goal = formData.get('goal');
  const icp = formData.get('icp') || '';
  if (!name || !goal) return;
  const admin = createAdminClient();
  await admin.from('campaigns').insert({ name, goal, icp, platform: 'email', status: 'draft' });
  revalidatePath('/admin');
}

export async function addLead(formData) {
  await requireUser();
  const campaign_id = Number(formData.get('campaign_id'));
  const first_name = formData.get('first_name');
  const email = formData.get('email');
  const company = formData.get('company') || '';
  if (!campaign_id || !first_name || !email) return;
  const admin = createAdminClient();
  await admin.from('leads').insert({ campaign_id, first_name, email, company });
  revalidatePath('/admin');
}
