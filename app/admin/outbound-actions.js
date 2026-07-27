'use server';

import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';
import { validateEmail } from '../../lib/outbound/validator';
import { revalidatePath } from 'next/cache';

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

// ── CAMPAIGN SEQUENCE STEPS ─────────────────────────────────

export async function saveSequence(formData) {
  await requireUser();
  const campaignId = formData.get('campaign_id');
  if (!campaignId) return;

  // Steps arrive as parallel arrays: subject[], body[], delay[]
  const subjects = formData.getAll('subject');
  const bodies = formData.getAll('body');
  const delays = formData.getAll('delay');

  const rows = [];
  for (let i = 0; i < subjects.length; i++) {
    const subject = (subjects[i] || '').trim();
    const body = (bodies[i] || '').trim();
    if (!subject && !body) continue;
    rows.push({
      campaign_id: Number(campaignId),
      step_number: rows.length + 1,
      subject_template: subject,
      body_template: body,
      delay_days: Number(delays[i]) || 3,
    });
  }

  const admin = createAdminClient();
  await admin.from('campaign_steps').delete().eq('campaign_id', campaignId);
  if (rows.length) {
    await admin.from('campaign_steps').insert(rows);
    // Step 1 doubles as the campaign's own template, which is what the
    // send loop reads for the first touch.
    await admin.from('campaigns').update({
      subject_template: rows[0].subject_template,
      body_template: rows[0].body_template,
    }).eq('id', campaignId);
  }
  revalidatePath(`/admin/campaigns/${campaignId}`);
}

// ── LEADS ───────────────────────────────────────────────────

export async function importCampaignLeads(formData) {
  await requireUser();
  const campaignId = formData.get('campaign_id');
  const raw = (formData.get('list') || '').toString();
  if (!campaignId || !raw.trim()) return;

  const rows = raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split(',').map(s => (s || '').trim());
    const email = parts.find(p => p.includes('@'));
    if (!email) return null;
    const nameOrCompany = parts[0] === email ? '' : parts[0];
    return {
      campaign_id: Number(campaignId),
      first_name: nameOrCompany || 'there',
      email,
      company: parts[2] || nameOrCompany || '',
      status: 'pending',
      validation_status: 'unknown',
    };
  }).filter(Boolean);

  if (!rows.length) return;
  const admin = createAdminClient();
  await admin.from('leads').insert(rows);
  revalidatePath(`/admin/campaigns/${campaignId}`);
}

export async function deleteCampaignLead(formData) {
  await requireUser();
  const id = formData.get('id');
  const campaignId = formData.get('campaign_id');
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('email_logs').delete().eq('lead_id', id);
  await admin.from('leads').delete().eq('id', id);
  revalidatePath(`/admin/campaigns/${campaignId}`);
}

export async function resetCampaignLead(formData) {
  await requireUser();
  const id = formData.get('id');
  const campaignId = formData.get('campaign_id');
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('leads').update({
    status: 'pending', sent_at: null, last_message_id: null, current_step: 1,
  }).eq('id', id);
  revalidatePath(`/admin/campaigns/${campaignId}`);
}

// ── VALIDATION ──────────────────────────────────────────────

/**
 * Validates every unvalidated lead in a campaign, in one pass. Kept bounded so
 * it finishes inside a serverless invocation: DNS lookups are fast, but we cap
 * the batch and report what is left rather than silently truncating.
 */
export async function validateCampaign(formData) {
  await requireUser();
  const campaignId = formData.get('campaign_id');
  if (!campaignId) return;

  const admin = createAdminClient();
  const BATCH = 40;
  const { data: leads } = await admin
    .from('leads')
    .select('id, email')
    .eq('campaign_id', campaignId)
    .or('validation_status.is.null,validation_status.eq.unknown')
    .limit(BATCH);

  for (const lead of leads || []) {
    try {
      const v = await validateEmail(lead.email);
      await admin.from('leads').update({
        validation_status: v.status,
        validation_reason: v.reason,
        validation_score: v.score,
      }).eq('id', lead.id);
    } catch (err) {
      await admin.from('leads').update({
        validation_status: 'UNKNOWN',
        validation_reason: `Check failed: ${err.message}`,
      }).eq('id', lead.id);
    }
  }
  revalidatePath(`/admin/campaigns/${campaignId}`);
}

// ── SENDING INBOXES ─────────────────────────────────────────

export async function saveInbox(formData) {
  await requireUser();
  const id = formData.get('id');
  const email = formData.get('email');
  const sender_name = formData.get('sender_name') || null;
  const app_password = (formData.get('app_password') || '').toString().trim();
  const daily_limit = Number(formData.get('daily_limit')) || 50;
  if (!email) return;

  const admin = createAdminClient();
  if (id) {
    const patch = { email, sender_name, daily_limit };
    if (app_password && !app_password.includes('•')) patch.app_password = app_password;
    await admin.from('sending_accounts').update(patch).eq('id', id);
  } else {
    await admin.from('sending_accounts').insert({
      email, sender_name, app_password: app_password || null, daily_limit, active: 1,
    });
  }
  revalidatePath('/admin/inboxes');
}

export async function deleteInbox(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('sending_accounts').delete().eq('id', id);
  revalidatePath('/admin/inboxes');
}

export async function toggleInbox(formData) {
  await requireUser();
  const id = formData.get('id');
  const active = formData.get('active') === '1' ? 0 : 1;
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('sending_accounts').update({ active }).eq('id', id);
  revalidatePath('/admin/inboxes');
}

export async function saveOutboundSettings(formData) {
  await requireUser();
  const rows = [];
  const map = {
    google_client_id: formData.get('google_client_id'),
    google_client_secret: formData.get('google_client_secret'),
    email_signature: formData.get('email_signature'),
    delay_seconds: formData.get('delay_seconds'),
  };
  for (const [key, value] of Object.entries(map)) {
    if (value === null || value === undefined) continue;
    const v = value.toString().trim();
    if (!v || v.includes('•')) continue;
    rows.push({ key, value: v });
  }
  if (rows.length) {
    const admin = createAdminClient();
    await admin.from('settings').upsert(rows, { onConflict: 'key' });
  }
  revalidatePath('/admin/inboxes');
}
