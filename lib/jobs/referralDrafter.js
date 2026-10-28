/**
 * Writes the first LinkedIn message to one person at a target company (2026-10-28), with the same
 * Groq models the job drafter uses, so Anas never writes a referral message himself. The message
 * goes out after the person accepts a plain connection request (free LinkedIn caps request notes).
 * Rules come from his locked voice: about 50 words, full sentences, no dashes, one real proof that
 * fits THIS company, and a 15 minute chat about their team, never a request for a job.
 */
const MODELS = ['openai/gpt-oss-120b', 'moonshotai/kimi-k2-instruct', 'llama-3.3-70b-versatile', 'qwen/qwen3-32b', 'openai/gpt-oss-20b'];

const PROOFS = `Real proofs Anas can use (pick the ONE closest to this company's work, never more than one):
1. Integrated a Saudi bank's core banking system with ZATCA e-invoicing Phase 2 (cryptographic signing, clearance).
2. Built a monthly retail reporting pipeline for UAE and KSA data across 13 retailers: refresh cut from 7 days to about 2 hours (Python, Gemini, Tableau).
3. Built an AI recruitment portal that screens resumes with Gemini, in use at his company.
4. Rebuilt 20+ credit risk models (PD, LGD, EAD, ECL) in Python and SQL, about 75% less manual effort.
5. Built a WhatsApp AI receptionist that answers in under 5 seconds, and the AI assistant on his own site.
6. Builds multi tenant backends with NestJS, Entra ID and row level security for client products.`;

const SYSTEM = `You write one short LinkedIn message from Anas Qureshi, an AI Implementation Engineer in Islamabad who builds AI integrations, to a person at a company in Saudi Arabia. The person has just accepted his connection request.
Rules:
1. 40 to 60 words, 3 or 4 full sentences, plain and direct, first person "I".
2. Open with their first name and one specific thing: their role at the company or the company's open role named below.
3. One sentence with the single most relevant proof from the list, with its real number if it has one. Never invent a fact, client, number or skill.
4. Ask for a 15 minute chat about how their team works. Never ask for a job or a referral in this first message.
5. Never use dashes of any kind, never use "hope this finds you well", "I came across", "reach out", "leverage", "synergy", "passionate". No emojis.
Reply with the message text only.`;

export async function draftReferralMessage({ name, title, company, role, why }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  const user = `Person: ${name}\nTheir LinkedIn headline: ${title}\nCompany: ${company}\nThe company's open role Anas fits: ${role}\nWhy it fits: ${why}\n\n${PROOFS}`;
  const errors = [];
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0.5, max_tokens: 700, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
      });
      if (!res.ok) { errors.push(`${model} ${res.status}`); continue; }
      const data = await res.json();
      let text = String(data.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim().replace(/^"|"$/g, '');
      // The voice rule allows no dashes; a model that slips one in gets a comma instead.
      text = text.replace(/\s*[–—]\s*/g, ', ').replace(/\s-\s/g, ', ');
      if (text.split(/\s+/).length >= 20) return text;
      errors.push(`${model} short reply`);
    } catch (e) { errors.push(`${model} ${e.message}`); }
  }
  throw new Error(`No message drafted: ${errors.join('; ').slice(0, 300)}`);
}
