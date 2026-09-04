/**
 * One click drafting for /admin/jobs: fetch the posting text if we do not have it, then ask
 * the same Groq model the site assistant uses for a tailored cover note, a direct message,
 * the resume variant to attach, and a one line fit check. Facts come only from RESUME_TEXT.
 */
import { createAdminClient } from '../supabase/admin';
import { RESUME_TEXT } from './resume';
import { getSettings, yes, isSet } from './settings';
import { PROJECT_IDS, DEFAULT_ORDER, SKILLS } from './resumeData';

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

const SYSTEM = `You write job application copy for Muhammad Anas. You are given his resume (the ONLY allowed source of facts about him) and one job posting. Return strict JSON with keys: fit_note, resume_variant, cover_note, dm_text, answers, resume_summary, project_order, skills_lead, email_subject, email_body, contact_role.

"resume_summary": 2 to 3 sentences for the top of a resume tailored to THIS posting. Only facts from the resume, but ordered so the parts this employer cares about come first, using their own vocabulary where it is truthful (for example say "agents" or "RAG" only if the resume supports it). No first person pronouns, no dashes.
"project_order": an array of project ids, most relevant to this posting first, using ONLY these ids: ${PROJECT_IDS.join(', ')}. Include 4 to 6. This reorders the resume, it never invents projects.
"skills_lead": array of 6 to 10 skill phrases to lead the resume's skills line, chosen ONLY from the phrases in the SKILLS list given below, ordered by what this posting asks for. Never add a skill that is not in that list.
"email_subject": a short subject line for a direct email to the hiring manager, 6 to 9 words, names the role.
"email_body": a 5 to 7 sentence email to the hiring manager (greeting "Hi <name>," if a contact name is known, otherwise "Hi,"), same facts as the cover note but written as an email, ending with a sign off of "Muhammad Anas" on its own line, and the line "Resume attached." before it. No dashes.
"contact_role": the job title most likely to own this hire at this company (for example "Head of Engineering", "Talent Acquisition", "Founder"), 2 to 4 words, so a LinkedIn people search can be built for it.

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

/**
 * Never throws. On failure it records why on the row so the page can show it and offer a retry,
 * because a server action that throws renders a blank "server side exception" page.
 */
export async function draftForJobSafe(id) {
  try {
    await draftForJob(id);
    return { ok: true };
  } catch (e) {
    const msg = (e && e.message ? e.message : String(e)).slice(0, 300);
    try {
      const admin = createAdminClient();
      const { data: job } = await admin.from('job_leads').select('notes').eq('id', id).single();
      await admin.from('job_leads').update({
        notes: [job?.notes, `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] DRAFT FAILED: ${msg}`].filter(Boolean).join('\n'),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    } catch { /* nothing more we can do */ }
    return { ok: false, error: msg };
  }
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
  const skillsList = Object.entries(SKILLS).map(([g, v]) => `${g}: ${v.join(', ')}`).join('\n');
  const user = `RESUME:\n${RESUME_TEXT}\n\nSKILLS LIST (the only phrases allowed in skills_lead):\n${skillsList}\n\nOPERATOR SETTINGS:\n${settingsText}\n\nPOSTING:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nLane: ${job.lane}\nSource: ${job.source}\nURL: ${job.url}\nNamed contact: ${job.contact_name || 'none'}\n${fetchNote ? `Note: ${fetchNote}; work from the title, company and location only and say so in fit_note.\n` : ''}Posting text:\n${description || '(none available)'}`;

  // Groq has silently deprecated models before, and a long posting can push the reply past the
  // token budget, so try the main model, then a smaller prompt, then a different model. The
  // caller turns a total failure into a visible message on the page, never a crash.
  async function ask(model, body, maxTokens) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature: 0.4, max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: body }],
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status} on ${model}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text.trim()) throw new Error(`Groq returned an empty reply on ${model}`);
    return extractJson(text);
  }

  const shortUser = user.length > 6000 ? `${user.slice(0, 6000)}\n(posting text truncated)` : user;
  let out, lastErr;
  for (const attempt of [
    () => ask('openai/gpt-oss-120b', user, 2400),
    () => ask('openai/gpt-oss-120b', shortUser, 2000),
    () => ask('llama-3.3-70b-versatile', shortUser, 2000),
  ]) {
    try { out = await attempt(); break; } catch (e) { lastErr = e; }
  }
  if (!out) throw new Error(lastErr ? lastErr.message : 'drafting failed');
  const clean = s => String(s || '').replace(/[–—]/g, ',').replace(/(\w)-(\w)/g, '$1 $2').trim();

  const variant = out.resume_variant === 'data' ? 'data' : 'ai';
  const allowedSkills = new Set(Object.values(SKILLS).flat().map(x => x.toLowerCase()));
  const order = (Array.isArray(out.project_order) ? out.project_order : []).filter(id => PROJECT_IDS.includes(id));
  const resumePlan = {
    summary: clean(out.resume_summary) || null,
    // Model chosen order first, then anything it left out, so the resume is never missing a project.
    project_order: [...new Set([...(order.length ? order : DEFAULT_ORDER[variant]), ...DEFAULT_ORDER[variant]])],
    skills_lead: (Array.isArray(out.skills_lead) ? out.skills_lead : []).filter(x => allowedSkills.has(String(x).toLowerCase())).slice(0, 10),
  };

  const patch = {
    resume_plan: resumePlan,
    email_subject: clean(out.email_subject) || null,
    email_body: clean(out.email_body) || null,
    contact_role: clean(out.contact_role) || null,
    description: description ? description.slice(0, 7000) : job.description,
    cover_note: clean(out.cover_note),
    dm_text: clean(out.dm_text),
    resume_variant: variant,
    answers: Array.isArray(out.answers) ? out.answers.filter(x => x && x.q && x.a).map(x => `${clean(x.q)}\n${clean(x.a)}`).join('\n\n') : null,
    notes: [job.notes, out.fit_note ? `[${new Date().toISOString().slice(0, 10)}] ${clean(out.fit_note)}` : null].filter(Boolean).join('\n'),
    updated_at: new Date().toISOString(),
  };
  if (job.status === 'new') patch.status = 'shortlisted';
  const { error: e2 } = await admin.from('job_leads').update(patch).eq('id', id);
  if (e2) throw new Error(e2.message);
  return patch;
}
