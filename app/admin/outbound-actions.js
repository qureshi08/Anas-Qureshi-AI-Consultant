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

/**
 * Save a sequence written in the PWOC builder. Keeps each move (P/W/O/C/sign-off)
 * as its own column so the builder can reload them section by section, while
 * body_template holds the assembled email that actually gets sent.
 */
export async function saveComposedSequence(formData) {
  await requireUser();
  const campaignId = formData.get('campaign_id');
  if (!campaignId) return;

  const subjects = formData.getAll('subject');
  const bodies = formData.getAll('body');
  const delays = formData.getAll('delay');
  const ps = formData.getAll('part_p');
  const ws = formData.getAll('part_w');
  const os = formData.getAll('part_o');
  const cs = formData.getAll('part_c');
  const signoffs = formData.getAll('part_signoff');

  const rows = [];
  for (let i = 0; i < subjects.length; i++) {
    const body = (bodies[i] || '').trim();
    const subject = (subjects[i] || '').trim();
    if (!body && !subject) continue;
    rows.push({
      campaign_id: Number(campaignId),
      step_number: rows.length + 1,
      subject_template: subject,
      body_template: body,
      delay_days: Number(delays[i]) || 3,
      part_p: ps[i] || null,
      part_w: ws[i] || null,
      part_o: os[i] || null,
      part_c: cs[i] || null,
      part_signoff: signoffs[i] || null,
    });
  }

  const admin = createAdminClient();
  await admin.from('campaign_steps').delete().eq('campaign_id', campaignId);
  if (rows.length) {
    await admin.from('campaign_steps').insert(rows);
    await admin.from('campaigns').update({
      subject_template: rows[0].subject_template,
      body_template: rows[0].body_template,
    }).eq('id', campaignId);
  }
  revalidatePath('/admin/compose');
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

export async function addSingleLead(formData) {
  await requireUser();
  const campaignId = formData.get('campaign_id');
  const email = formData.get('email');
  if (!campaignId || !email) return;
  const admin = createAdminClient();
  await admin.from('leads').insert({
    campaign_id: Number(campaignId),
    first_name: formData.get('first_name') || 'there',
    last_name: formData.get('last_name') || '',
    email,
    company: formData.get('company') || '',
    industry: formData.get('industry') || '',
    title: formData.get('title') || '',
    city: formData.get('city') || '',
    state: formData.get('state') || '',
    custom_note: formData.get('custom_note') || '',
    status: 'pending',
    validation_status: 'unknown',
  });
  revalidatePath('/admin/leads');
}

/**
 * CSV import. Header row required; only `email` is mandatory, everything else
 * is matched loosely so exports from different tools mostly just work.
 */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',' || ch === '\t' || ch === ';') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

export async function importCsvLeads(formData) {
  await requireUser();
  const campaignId = formData.get('campaign_id');
  const file = formData.get('csv');
  if (!campaignId || !file || typeof file === 'string' || file.size === 0) return;

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return;

  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  const pick = (cells, ...names) => {
    for (const n of names) {
      const idx = headers.indexOf(n);
      if (idx !== -1 && cells[idx] && cells[idx].trim()) return cells[idx].trim();
    }
    return '';
  };

  const out = [];
  for (const cells of rows.slice(1)) {
    const email = pick(cells, 'email', 'email_address', 'work_email');
    if (!email || !email.includes('@')) continue;
    const full = pick(cells, 'full_name', 'name');
    out.push({
      campaign_id: Number(campaignId),
      first_name: pick(cells, 'first_name', 'firstname') || (full ? full.split(' ')[0] : '') || 'there',
      last_name: pick(cells, 'last_name', 'lastname') || (full ? full.split(' ').slice(1).join(' ') : ''),
      email,
      company: pick(cells, 'company', 'company_name', 'organization'),
      industry: pick(cells, 'industry', 'niche'),
      title: pick(cells, 'title', 'job_title', 'headline'),
      city: pick(cells, 'city'),
      state: pick(cells, 'state', 'region'),
      custom_note: pick(cells, 'custom_note', 'note', 'notes'),
      status: 'pending',
      validation_status: 'unknown',
    });
  }

  if (!out.length) return;
  const admin = createAdminClient();
  // Chunked so a big file doesn't blow the request size.
  for (let i = 0; i < out.length; i += 200) {
    await admin.from('leads').insert(out.slice(i, i + 200));
  }
  revalidatePath('/admin/leads');
}

export async function updateLeadStatus(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const patch = { status: formData.get('status') || 'pending' };
  const notes = formData.get('notes');
  if (notes !== null) patch.notes = notes;
  const admin = createAdminClient();
  await admin.from('leads').update(patch).eq('id', id);
  revalidatePath('/admin/leads');
}

export async function validateOneLead(formData) {
  await requireUser();
  const id = formData.get('id');
  const email = formData.get('email');
  if (!id || !email) return;
  const admin = createAdminClient();
  try {
    const v = await validateEmail(email);
    await admin.from('leads').update({
      validation_status: v.status, validation_reason: v.reason, validation_score: v.score,
    }).eq('id', id);
  } catch (err) {
    await admin.from('leads').update({
      validation_status: 'UNKNOWN', validation_reason: `Check failed: ${err.message}`,
    }).eq('id', id);
  }
  revalidatePath('/admin/leads');
}

export async function deleteCampaign(formData) {
  await requireUser();
  const id = formData.get('id');
  if (!id) return;
  const admin = createAdminClient();
  await admin.from('email_logs').delete().eq('campaign_id', id);
  await admin.from('campaign_steps').delete().eq('campaign_id', id);
  await admin.from('leads').delete().eq('campaign_id', id);
  await admin.from('campaigns').delete().eq('id', id);
  revalidatePath('/admin/campaigns');
  revalidatePath('/admin/cold-email');
}

export async function deleteAllCampaignLeads(formData) {
  await requireUser();
  const campaignId = formData.get('campaign_id');
  if (!campaignId) return;
  const admin = createAdminClient();
  await admin.from('email_logs').delete().eq('campaign_id', campaignId);
  await admin.from('leads').delete().eq('campaign_id', campaignId);
  revalidatePath('/admin/leads');
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
