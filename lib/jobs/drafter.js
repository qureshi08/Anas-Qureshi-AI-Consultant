/**
 * One click drafting for /admin/jobs: fetch the posting text if we do not have it, then ask
 * the same Groq model the site assistant uses for a tailored cover note, a direct message,
 * the resume variant to attach, and a one line fit check. Facts come only from RESUME_TEXT.
 */
import { createAdminClient } from '../supabase/admin';
import { RESUME_TEXT } from './resume';
import { getSettings, yes, isSet } from './settings';

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };

function stripHtml(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/** Pull the posting body. LinkedIn guest pages carry it in a known div; anything else gets the page text. */
export async function fetchPostingText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: 'no-store', redirect: 'follow' });
    if (!res.ok) return { text: '', note: `page returned HTTP ${res.status}` };
    const html = await res.text();
    const li = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/);
    if (li) {
      const crit = [...html.matchAll(/description__job-criteria-subheader">\s*([\s\S]*?)\s*<\/h3>\s*<span[^>]*>\s*([\s\S]*?)\s*<\/span>/g)].map(m => `${stripHtml(m[1])}: ${stripHtml(m[2])}`).join('. ');
      return { text: `${crit}\n${stripHtml(li[1])}`.slice(0, 7000), note: '' };
    }
    const body = html.match(/<body[\s\S]*?<\/body>/i);
    return { text: stripHtml(body ? body[0] : html).slice(0, 7000), note: '' };
  } catch (e) {
    return { text: '', note: `could not fetch posting (${e.name})` };
  } finally {
    clearTimeout(t);
  }
}

const SYSTEM = `You write job application copy for Muhammad Anas. You are given his resume (the ONLY allowed source of facts about him) and one job posting. Return strict JSON with keys: fit_note, resume_variant, cover_note, dm_text, answers.

"answers" is an array of {q, a} objects for the screening questions application forms usually ask, written for THIS posting, plain prose, no dashes, each answer 2 to 4 sentences: "Why do you want to work at <company>?", "Why are you a good fit for this role?", "What would you do in your first 30 days?", "Describe a relevant project" (pick the resume project that matches the posting best, with its real numbers), and "Salary expectation" (one line, use the salary line from OPERATOR SETTINGS that matches the posting's lane), and "Notice period / availability" (use the notice period from OPERATOR SETTINGS verbatim; if it is not set, write "to be confirmed").

Rules that do not bend:
1. Never invent experience, tools, years, clients, or numbers. If the posting wants something not on the resume, say so plainly in one clause ("I have not shipped on Copilot Studio by name, but...") instead of implying it.
2. NO DASHES OR HYPHENS anywhere in your output text (write "end to end", "60 to 75 percent", "e invoicing"). Use commas and periods.
3. cover_note: 3 to 5 sentences, plain prose, no greeting line, no sign off, no markdown, no bullet points. Sentence 1 names something specific from THIS posting (their product, their stated problem, their stack, a phrase they used). Sentences 2 and 3 give the one or two resume proofs that match it best, with the real numbers. Include the live demo link anas-qureshi-ai-consultant.vercel.app once. Last sentence is one small ask. Location line, follow the OPERATOR SETTINGS given with the posting: onsite Gulf and relocation allowed, end with "Based in Islamabad, ready to relocate to <city>."; onsite Gulf and relocation not allowed, end with "Based in Islamabad, this would need to be remote on my side, is that possible for this role?"; onsite Lahore or Karachi, same logic with the relocate_pk setting; remote or Islamabad, mention Islamabad, UTC+5.
4. dm_text: 40 to 60 words, a LinkedIn message to the named contact if one is given, otherwise to the hiring team. Starts "Hi <first name>," if a name is known. Mentions the exact role, one matching proof with a number, and asks one thing. No links except the demo link, no dashes.
5. resume_variant: "ai" (default) or "data" when the posting is mainly SQL, ETL, warehousing, dashboards.
6. fit_note: one sentence, honest, for Anas's eyes only: seniority asked versus his 2 years, remote or onsite and city, pay if stated, any hard mismatch. Start with "Fit:" or "Stretch:" or "Mismatch:".
7. Never mention CBT client names. Never use the words "leverage" or "synergy" or "passionate".`;

function extractJson(s) {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in model reply');
  return JSON.parse(m[0]);
}

export async function draftForJob(id) {
  const admin = createAdminClient();
  const { data: job, error } = await admin.from('job_leads').select('*').eq('id', id).single();
  if (error || !job) throw new Error('job not found');

  let description = job.description || '';
  let fetchNote = '';
  if (!description || description.length < 400) {
    const r = await fetchPostingText(job.url);
    if (r.text && r.text.length > description.length) description = r.text;
    fetchNote = r.note;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  const s = await getSettings();
  const settingsText = [
    `notice_period: ${isSet(s.notice_period) ? s.notice_period : 'not set'}`,
    `relocate_gulf: ${isSet(s.relocate_gulf) ? (yes(s.relocate_gulf) ? 'yes' : 'no') : 'not set, treat as no'}`,
    `relocate_pk (Lahore, Karachi): ${isSet(s.relocate_pk) ? (yes(s.relocate_pk) ? 'yes' : 'no') : 'not set, treat as no'}`,
    `salary remote USD: ${s.salary_usd}`, `salary Pakistan: ${s.salary_pkr}`, `salary Gulf: ${s.salary_gulf}`,
  ].join('\n');
  const user = `RESUME:\n${RESUME_TEXT}\n\nOPERATOR SETTINGS:\n${settingsText}\n\nPOSTING:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nLane: ${job.lane}\nSource: ${job.source}\nURL: ${job.url}\nNamed contact: ${job.contact_name || 'none'}\n${fetchNote ? `Note: ${fetchNote}; work from the title, company and location only and say so in fit_note.\n` : ''}Posting text:\n${description || '(none available)'}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      temperature: 0.4,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const out = extractJson(data.choices?.[0]?.message?.content || '');
  const clean = s => String(s || '').replace(/[–—]/g, ',').replace(/(\w)-(\w)/g, '$1 $2').trim();

  const patch = {
    description: description ? description.slice(0, 7000) : job.description,
    cover_note: clean(out.cover_note),
    dm_text: clean(out.dm_text),
    resume_variant: out.resume_variant === 'data' ? 'data' : 'ai',
    answers: Array.isArray(out.answers) ? out.answers.filter(x => x && x.q && x.a).map(x => `${clean(x.q)}\n${clean(x.a)}`).join('\n\n') : null,
    notes: [job.notes, out.fit_note ? `[${new Date().toISOString().slice(0, 10)}] ${clean(out.fit_note)}` : null].filter(Boolean).join('\n'),
    updated_at: new Date().toISOString(),
  };
  if (job.status === 'new') patch.status = 'shortlisted';
  const { error: e2 } = await admin.from('job_leads').update(patch).eq('id', id);
  if (e2) throw new Error(e2.message);
  return patch;
}
