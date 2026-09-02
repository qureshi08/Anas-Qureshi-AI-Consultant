/**
 * Operator settings for the job stream, edited on /admin/jobs, stored in job_settings.
 * Everything the drafts and the standard answers need from Anas lives here, not in chat.
 */
import { createAdminClient } from '../supabase/admin';

export const SETTING_FIELDS = [
  ['notice_period', 'Notice period at current job', 'e.g. 30 days, or 2 weeks'],
  ['relocate_gulf', 'Relocate to the Gulf for an onsite role with a visa? (yes / no)', 'yes or no'],
  ['relocate_pk', 'Relocate inside Pakistan (Lahore, Karachi) for onsite? (yes / no)', 'yes or no'],
  ['salary_usd', 'Salary line, remote USD', '$2,000 to $3,500 per month, negotiable for a long term role'],
  ['salary_pkr', 'Salary line, Pakistan', 'PKR 300,000 to 450,000 per month'],
  ['salary_gulf', 'Salary line, Gulf', 'AED 8,000 to 14,000 per month, or SAR equivalent'],
  ['daily_goal', 'Applications per day goal', '10'],
];

export const DEFAULTS = {
  notice_period: '',
  relocate_gulf: '',
  relocate_pk: '',
  salary_usd: '$2,000 to $3,500 per month depending on scope, negotiable for a long term role',
  salary_pkr: 'PKR 300,000 to 450,000 per month',
  salary_gulf: 'AED 8,000 to 14,000 per month, or SAR equivalent',
  daily_goal: '10',
};

export async function getSettings() {
  const admin = createAdminClient();
  const { data } = await admin.from('job_settings').select('key, value');
  const s = { ...DEFAULTS };
  for (const row of data || []) if (row.value !== null && row.value !== undefined) s[row.key] = row.value;
  return s;
}

export function yes(v) { return /^\s*(y|yes|true|1)\s*$/i.test(v || ''); }
export function isSet(v) { return !!(v && v.trim()); }

/** The standard form answers, built from the resume facts plus the settings. */
export function buildAnswers(s) {
  const notice = isSet(s.notice_period) ? s.notice_period : 'NOT SET, fill it in Settings above';
  const reloc = [
    isSet(s.relocate_gulf) ? `Gulf onsite with visa: ${yes(s.relocate_gulf) ? 'yes' : 'no'}` : 'Gulf onsite: not set',
    isSet(s.relocate_pk) ? `Lahore or Karachi onsite: ${yes(s.relocate_pk) ? 'yes' : 'no'}` : 'Lahore or Karachi onsite: not set',
  ].join('. ');
  return [
    ['Full name', 'Muhammad Anas'],
    ['Email', 'muhammadanasq@gmail.com'],
    ['Phone', '+92 302 9222402'],
    ['LinkedIn', 'https://linkedin.com/in/anasqureshiai'],
    ['Portfolio / website', 'https://anas-qureshi-ai-consultant.vercel.app'],
    ['Location', 'Islamabad, Pakistan (UTC+5)'],
    ['Current title', 'AI Consultant, Convergent Business Technologies (2024 to present)'],
    ['Years of experience', '2'],
    ['Education', 'BSc Computer Science, Iqra University Islamabad, 2019 to 2023'],
    ['Work authorization', 'Pakistani national. For remote roles, hired as a contractor or through an employer of record (Deel, Remote, Oyster). Gulf onsite roles need a sponsored employment visa.'],
    ['Notice period', notice],
    ['Relocation', reloc],
    ['Salary, USD remote', s.salary_usd],
    ['Salary, Pakistan', s.salary_pkr],
    ['Salary, Gulf', s.salary_gulf],
    ['Time zone overlap', 'Full overlap with Gulf hours, UK and EU mornings to mid afternoon, US East Coast mornings'],
    ['Headline', 'AI Automation Engineer | Python, n8n, LLM Workflows, API Integrations, Data Pipelines'],
    ['Short bio (3 lines)', 'AI Consultant at Convergent Business Technologies since 2024, building automation and AI systems that remove manual work from finance, compliance and recruiting workflows with Python, SQL, n8n and LLMs. Shipped a production recruitment portal on Next.js and Supabase, and an LLM assisted SKU mapping pipeline that cut mapping time from 80 minutes to 40 seconds per 100 SKUs. Automated workflows have reduced processing time by 60 to 75 percent.'],
  ];
}

/** Lanes hidden from the default "To work" view, given the relocation answers. */
export function hiddenLanes(s) {
  const out = [];
  if (isSet(s.relocate_gulf) && !yes(s.relocate_gulf)) out.push('Gulf');
  if (isSet(s.relocate_pk) && !yes(s.relocate_pk)) out.push('PK');
  return out;
}
