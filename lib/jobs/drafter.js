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
"email_body": short and scannable, never one dense block. Structure it as separate lines with a blank line between each: greeting "Hi <name>," (or "Hi,") alone on its own line, then a 1 to 2 sentence paragraph naming something specific from the posting, then a 1 to 2 sentence paragraph with the one matching proof and its real number, then a single sentence paragraph with the small ask, then "Resume attached." alone on its own line, then "Muhammad Anas" alone on its own line. 5 to 7 sentences total across those paragraphs, never fewer breaks than that. No dashes.
"contact_role": the job title most likely to own this hire at this company (for example "Head of Engineering", "Talent Acquisition", "Founder"), 2 to 4 words, so a LinkedIn people search can be built for it.

"answers" is an array of {q, a} objects for the screening questions application forms usually ask, written for THIS posting, plain prose, no dashes, each answer 2 to 4 sentences: "Why do you want to work at <company>?", "Why are you a good fit for this role?", "What would you do in your first 30 days?", "Describe a relevant project" (pick the resume project that matches the posting best, with its real numbers), and "Salary expectation" (one line, use the salary line from OPERATOR SETTINGS that matches the posting's lane), and "Notice period / availability" (use the notice period from OPERATOR SETTINGS verbatim; if it is not set, write "to be confirmed").

Rules that do not bend:
1. Never invent experience, tools, years, clients, or numbers. If the posting wants something not on the resume, say so plainly in one clause ("I have not shipped on Copilot Studio by name, but...") instead of implying it.
2. NO DASHES OR HYPHENS anywhere in your output text (write "end to end", "60 to 75 percent", "e invoicing"). Use commas and periods.
3. cover_note: 3 to 5 sentences, plain prose, no greeting line, no sign off, no markdown, no bullet points. Sentence 1 must be a concrete, checkable detail from THIS posting, a named requirement, a specific tool or stack, a number, a phrase they actually used, never a restatement of their one line company tagline or mission statement. "They build an AI platform for X" is not personalization even if true, because it could be sent unchanged to every company in that space. If the posting genuinely gives nothing concrete beyond a tagline, say so in fit_note rather than papering over it with a generic sentence. Sentences 2 and 3 give the one or two resume proofs that match it best, with the real numbers. Include his LinkedIn profile linkedin.com/in/anasqureshiai once. Last sentence is one small ask. Location line, follow the OPERATOR SETTINGS given with the posting: onsite Gulf and relocation allowed, end with "Based in Islamabad, ready to relocate to <city>."; onsite Gulf and relocation not allowed, end with "Based in Islamabad, this would need to be remote on my side, is that possible for this role?"; onsite Lahore or Karachi, same logic with the relocate_pk setting; remote or Islamabad, mention Islamabad, UTC+5.
4. dm_text: Anas has no LinkedIn Premium, so he cannot message people outside his network directly, only send a connection request with a short note attached, which LinkedIn hard caps at 300 characters including the greeting. Write dm_text as that note: 25 to 35 words maximum, under 300 characters total, no exceptions. Starts "Hi <first name>," if a name is known. Names the exact role or company in a few words and gives the barest hint of fit, there is no room for a full pitch here, the real pitch goes in the email. No links, no dashes.
5. resume_variant: "ai" (default) or "data" when the posting is mainly SQL, ETL, warehousing, dashboards.
6. fit_note: one sentence, honest, for Anas's eyes only: seniority asked versus his 2 years, remote or onsite and city, pay if stated, any hard mismatch. Start with "Fit:" or "Stretch:" or "Mismatch:".
7. Never mention CBT client names. Never use the words "leverage" or "synergy" or "passionate".
8. Proof selection: the resume has several distinct proofs (retail reporting automation and AI assisted matching, recruiting workflow automation, credit risk model automation, banking and tax compliance integration, a shipped web app, his own outreach and AI assistant systems). Pick whichever ONE proof's domain most closely matches THIS company's actual stated business or problem, not simply the most impressive or most quantified one by default. A logistics or fleet company reads differently than a data infrastructure company or a recruiting company, match the story to them, do not reach for the same proof out of habit.`;

const TRAINING_ADDENDUM = `

THIS POSTING IS AI TRAINING, DATA LABELING OR EXPERT EVALUATION WORK (lane Training), not a job. Adjust:
- cover_note is a marketplace proposal: 3 to 4 sentences. Sentence 1 names a specific line of THIS listing (its domain, task type or tools). Then the closest real proof with its number (charts and dashboards: Tableau and Power BI across 13 retailers, monthly refresh from 7 days to about 2 hours; finance and risk: 20 plus credit risk models rebuilt in Python and SQL; LLM work: n8n and Python with language models; Urdu: native speaker). Say plainly, in one clause, that he has not done AI training platform work before, never claim it. End with availability and a line that he writes precise step by step reasoning. No demo link, no relocation line.
- dm_text: 30 to 45 words, a short note for a platform inbox or recruiter, same facts.
- answers: use "Why are you a good fit for this project?", "Describe a relevant example of your work", "How would you explain your reasoning on a task?", "Availability and hourly rate" (rate: upper half of the posted range if one is stated, never under 25 dollars an hour for expert work, hours per week to be confirmed).
- email_subject and email_body may be brief. resume_variant "data". fit_note starts "Fit:" or "Mismatch:" and states pay and whether it needs subject expertise he lacks.`;

const STARTUP_ADDENDUM = `

THIS ROW IS A STARTUP REVERSE PITCH (lane Startups): a fresh, small company found in Y Combinator's public directory. Ignore the job application framing above and instead write a cold pitch offering to build one specific automation or AI workflow piece for them, as a small paid trial, never as a request to be hired as an employee, even if the description below shows they do have a real open role.
- If the description below contains an "Open role:" line, THAT is what the pitch is about, not a generic automation or agent pitch. It names a real title, the skills they specifically asked for, salary, experience level, and visa terms. Reference that title and at least one of those specific skills directly, and pick the resume proof that matches those skills, not just the company's general business. Never write a pitch that could apply to any AI company when a specific, detailed role requirement is sitting right there unused. If the visa line says "US citizen/visa only", note plainly in fit_note that a formal hire is closed but the small paid trial pitch, being independent contractor work, is not affected by that restriction, still worth sending.
- When there is no "Open role:" line, fall back to the company description itself: it is usually a real launch post, often with a founder's own words about a specific pain point, a number, an origin story, or a named tool or workflow. Find ONE concrete, checkable detail in it, a named problem they described (not their one line tagline), a number they gave, a specific workflow or tool they mentioned, and build the opening line around THAT, quoting or closely paraphrasing it. A sentence that only restates their tagline or mission statement ("X aims to build an AI platform that improves Y") is not personalization and is not acceptable, even if it is technically true, because it could be sent to any company in their space unchanged. If the description genuinely has nothing concrete in it beyond a tagline, say so plainly in fit_note rather than papering over it with a generic restatement.
- Proof: pick exactly ONE resume proof whose domain most closely matches what THIS company actually does, per rule 8 above. Never stack two proofs from different domains in the same pitch (for example, tax and invoicing compliance work does not belong in a pitch to a lending or loan servicing company, credit risk modeling does). One well matched proof beats two generic ones.
- cover_note (the pitch, plain prose, 3 to 4 sentences, no greeting, no sign off): sentence 1 is the concrete detail described above, never a tagline restatement. Sentences 2 and 3 give the one matched proof with its real number. Last sentence proposes a small, scoped paid trial project (not a job, not a full time role) and asks one small question. Include his LinkedIn profile linkedin.com/in/anasqureshiai once.
- email_subject: names the specific problem or outcome, never "job application" or "regarding the position", 6 to 9 words.
- email_body: short and scannable, never one dense block. Separate lines with a blank line between each: greeting "Hi <first name>," (using the founder name below if given, otherwise "Hi,") alone on its own line, then a short paragraph opening with the concrete detail (not a tagline restatement), then a short paragraph with the one matched proof and its real number, then a single sentence paragraph proposing the small paid trial and asking one thing, then "Muhammad Anas" alone on its own line. 5 to 6 sentences total across those paragraphs. No "Resume attached" line, this is a pitch email, not a job application. No dashes.
- dm_text: Anas has no LinkedIn Premium, this is a connection request note, not a message, hard capped at 300 characters. 20 to 30 words maximum. "Hi <first name>," if the founder is named, then reference the same concrete detail used in the email opener, in a few words, not a tagline restatement, then the barest hint of the pitch, nothing more, there is no room for proof or numbers here, that goes in the email. No links, no dashes.
- contact_role: use the founder role given below verbatim, never guess a different one.
- fit_note: one line, honest, whether the company's stated problem is something the resume can actually back up with real proof, starts "Fit:" or "Stretch:" or "Mismatch:".
- answers: return an empty array, there is no application form for this row.
- resume_variant: "ai" unless the company is clearly a pure data or BI product.
Never claim to have worked with this company before, never invent a metric or detail about their business that is not in the description given, never use the words "leverage" or "synergy" or "passionate" or "I help".`;

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
  // Startups rows already carry the company's own description at insert time; the URL is a YC
  // directory page, not a posting, so refetching it would just add noise, not signal.
  if (job.lane !== 'Startups' && (!description || description.length < 400)) {
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
  const user = `RESUME:\n${RESUME_TEXT}\n\nSKILLS LIST (the only phrases allowed in skills_lead):\n${skillsList}\n\nOPERATOR SETTINGS:\n${settingsText}\n\nPOSTING:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nLane: ${job.lane}\nSource: ${job.source}\nURL: ${job.url}\nNamed contact: ${job.contact_name || 'none'}\nNamed contact's role: ${job.contact_role || 'unknown, guess "Founder" for a Startups row'}\n${fetchNote ? `Note: ${fetchNote}; work from the title, company and location only and say so in fit_note.\n` : ''}${job.lane === 'Startups' ? 'Company description' : 'Posting text'}:\n${description || '(none available)'}`;

  // Groq has silently deprecated models before, and a long posting can push the reply past the
  // token budget, so try the main model, then a smaller prompt, then a different model. The
  // caller turns a total failure into a visible message on the page, never a crash.
  // strict=true asks Groq to enforce json_object mode server side. gpt-oss-120b intermittently
  // fails THAT validator with a 400 "Failed to generate JSON" before returning anything, on
  // prompts that are otherwise fine (a documented Groq quirk on this model, not a prompt-length
  // or content problem: the same content fails on both the full and the shortened attempt).
  // strict=false drops response_format entirely and leans on the SYSTEM prompt's own instruction
  // plus the extractJson regex fallback below, which sidesteps that validator completely.
  async function ask(model, body, maxTokens, strict = true) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature: 0.4, max_tokens: maxTokens,
        ...(strict ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: job.lane === 'Training' ? SYSTEM + TRAINING_ADDENDUM : job.lane === 'Startups' ? SYSTEM + STARTUP_ADDENDUM : SYSTEM }, { role: 'user', content: body }],
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status} on ${model}${strict ? '' : ' (no strict mode)'}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text.trim()) throw new Error(`Groq returned an empty reply on ${model}`);
    const parsed = extractJson(text);
    // A reply that parses but carries no letter is a failure too (usually a truncated JSON),
    // otherwise the row saves as "drafted" with an empty cover note and the card looks broken.
    if (!parsed || !String(parsed.cover_note || '').trim()) throw new Error(`No cover note in the reply from ${model}`);
    return parsed;
  }

  const shortUser = user.length > 6000 ? `${user.slice(0, 6000)}\n(posting text truncated)` : user;
  const errors = [];
  let out;
  for (const attempt of [
    () => ask('openai/gpt-oss-120b', user, 2400, true),
    () => ask('openai/gpt-oss-120b', shortUser, 2000, true),
    () => ask('openai/gpt-oss-120b', shortUser, 2000, false),
  ]) {
    try { out = await attempt(); break; } catch (e) { errors.push(e.message); }
  }
  // Groq retires model names without warning, so ask the account which chat models it can
  // actually use right now instead of hard coding a second name that may not exist.
  if (!out) {
    let alive = [];
    try {
      const list = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
      if (list.ok) {
        const body = await list.json();
        alive = (body.data || []).map(m => m.id).filter(id => !/whisper|tts|guard|vision|embed/i.test(id));
      }
    } catch (e) { errors.push(`model list: ${e.message}`); }
    for (const model of alive.slice(0, 3)) {
      try { out = await ask(model, shortUser, 2000, true); break; } catch (e) { errors.push(e.message); }
      try { out = await ask(model, shortUser, 2000, false); break; } catch (e) { errors.push(e.message); }
    }
  }
  if (!out) throw new Error(errors.map(e => e.slice(0, 120)).join(' | ').slice(0, 280));
  // The blanket "no dashes" cleanup below strips hyphens from every word, including inside
  // the demo URL, which breaks it into a dead link (anas qureshi ai consultant.vercel.app,
  // not a real domain). Repair that one known string back to its real, hyphenated form after
  // the generic cleanup runs, rather than special casing the regex itself.
  const clean = s => String(s || '')
    .replace(/[–—]/g, ',')
    .replace(/(\w)-(\w)/g, '$1 $2')
    .replace(/anas qureshi ai consultant\.vercel\.app/gi, 'anas-qureshi-ai-consultant.vercel.app')
    .trim();

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
