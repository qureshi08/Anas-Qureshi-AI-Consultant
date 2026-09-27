/**
 * What the job stream targets. RELOCKED by Anas 2026-09-28: AI Implementation Engineer and its family
 * (AI Integration Engineer, Solutions Engineer, Implementation Engineer, Integration Engineer, Forward Deployed).
 * Why: Anas builds everything with AI coding tools and has little CS or ML theory (memory user_builder_not_theorist).
 * The Applied AI Engineer target (2026-09-26) leaned on theory and DSA rounds; 51 applications to AI and ML titles
 * produced no interviews. The implementation family is the work he has actually delivered (ZATCA gateway, Odoo and
 * Zoho middleware, MMM backend integrations, recruitment portal) and, per a 2026-09-28 count, had 51 remote postings
 * open to Pakistan on LinkedIn plus 8 on worldwide boards. Market note: the exact "AI Implementation Engineer"
 * title is still rare, so the gate matches the whole family, not one exact string.
 * Two streams: this normal remote stream and the Startups lane (startupFetcher.js).
 *
 * Everything the fetcher searches for and gates on lives here, so a future change of target
 * is one file, not a hunt through regexes.
 */

// Minimum applications per day. The settings page can raise it, never lower it below this.
export const DAILY_GOAL_MIN = 15;   // tailored applications a day, each with same-day outreach

// HARD GATE: a posting's title must match this or it is dropped, whatever else it scores.
// "Relevant roles only" (memory feedback_startups_hard_gates_relevant_only): no fallback rows.
export const TARGET_TITLE_RX = new RegExp([
  String.raw`\b(ai|llm|gen\s?ai|generative\s+ai)\s+(implementation|integrations?|solutions?|deployment)\s+(engineer|developer|specialist|consultant)\b`, // AI Implementation / Integration / Solutions Engineer
  String.raw`\bimplementation\s+(engineer|specialist|consultant|developer)\b`,
  String.raw`\bintegrations?\s+(engineer|developer|specialist)\b`,
  String.raw`\bsolutions?\s+(engineer|consultant)\b`,
  String.raw`\b(technical\s+)?onboarding\s+engineer\b|\bdeployment\s+engineer\b`,
  String.raw`\bforward[\s-]?deployed\b|\bFDE\b`,                                                                // only survives the location gate if worldwide / Gulf / Pakistan
  String.raw`\bai\s+automation\s+(engineer|developer|specialist)\b`,                                                  // close cousin, same pitch
].join('|'), 'i');

// LinkedIn guest search: every keyword runs in every location.
export const LINKEDIN_KEYWORDS = [
  'AI implementation engineer', 'AI integration engineer', 'AI solutions engineer', 'implementation engineer',
  'integration engineer', 'solutions engineer', 'forward deployed engineer', 'technical onboarding engineer', 'AI automation engineer',
];
// Worldwide gets " remote" appended (the guest endpoint ignores its own remote filter). The other
// locations are searched as is, because onsite and relocation roles there are wanted too.
export const LINKEDIN_LOCATIONS = ['Worldwide', 'United States', 'Canada', 'United Arab Emirates', 'Saudi Arabia', 'Pakistan'];

// Candidate Greenhouse / Lever / Ashby boards of tech companies that hire solutions engineers.
// These are GUESSES of the public board slug. The fetcher tries each one it does not already
// know and only saves it to job_ats_boards if the board really answers with jobs, so a wrong
// guess costs one failed request and is never stored.
export const SEED_BOARDS = [
  ['anthropic', 'greenhouse'], ['databricks', 'greenhouse'], ['gitlab', 'greenhouse'], ['figma', 'greenhouse'],
  ['datadog', 'greenhouse'], ['mongodb', 'greenhouse'], ['elastic', 'greenhouse'], ['twilio', 'greenhouse'],
  ['cloudflare', 'greenhouse'], ['samsara', 'greenhouse'], ['airtable', 'greenhouse'], ['postman', 'greenhouse'],
  ['grafanalabs', 'greenhouse'], ['pagerduty', 'greenhouse'], ['intercom', 'greenhouse'], ['brex', 'greenhouse'],
  ['vercel', 'greenhouse'], ['scaleai', 'greenhouse'], ['stripe', 'greenhouse'], ['okta', 'greenhouse'],
  ['openai', 'ashby'], ['cohere', 'ashby'], ['elevenlabs', 'ashby'], ['notion', 'ashby'], ['ramp', 'ashby'],
  ['linear', 'ashby'], ['supabase', 'ashby'], ['langchain', 'ashby'], ['pinecone', 'ashby'], ['replit', 'ashby'],
  ['perplexity', 'ashby'], ['zapier', 'ashby'], ['deel', 'ashby'], ['n8n', 'ashby'], ['clay', 'ashby'],
  ['decagon', 'ashby'], ['sierra', 'ashby'], ['harvey', 'ashby'], ['retool', 'ashby'], ['writer', 'ashby'],
  ['mistral', 'lever'], ['palantir', 'lever'], ['weaviate', 'lever'],
];
