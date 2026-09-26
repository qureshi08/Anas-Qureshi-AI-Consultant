/**
 * What the job stream targets. RELOCKED by Anas 2026-09-26 after research (Income Plan/job-first-plan-2026-09-26.md):
 * primary Applied AI Engineer / AI Engineer (the largest pool of remote roles explicitly open to Pakistan), secondary
 * AI integration / implementation engineer (Gulf, fintech, ERP, where his ZATCA and Entra work is rare). US-only
 * Solutions / Sales Engineer roles were the old target (2026-09-25) and produced 51 applications and no interviews;
 * they rarely hire from Pakistan. Two streams: this normal remote stream and the Startups lane (startupFetcher.js).
 * Fewer, tailored applications, each followed by outreach to the hiring manager (Huntr Q1 2026: 11 to 20 applications
 * converted 3.5x better per application than 100+, tailored resumes 2x).
 *
 * Everything the fetcher searches for and gates on lives here, so a future change of target
 * is one file, not a hunt through regexes.
 */

// Minimum applications per day. The settings page can raise it, never lower it below this.
export const DAILY_GOAL_MIN = 15;   // tailored applications a day, each with same-day outreach (was 50 untailored)

// HARD GATE: a posting's title must match this or it is dropped, whatever else it scores.
// "Relevant roles only" (memory feedback_startups_hard_gates_relevant_only): no fallback rows.
export const TARGET_TITLE_RX = new RegExp([
  String.raw`\b(applied\s+)?(ai|a\.i\.|llm|gen\s?ai|generative\s+ai)(\s*/\s*ml)?\s+(engineer|developer|specialist)\b`,      // AI Engineer, Applied AI Engineer, LLM Engineer, GenAI Developer
  String.raw`\bai\s+(automation|integration|solutions?|product|systems?|platform|agents?|application|backend|full[\s-]?stack)\s+(engineer|developer)\b`,
  String.raw`\b(agent(ic)?|prompt|llm\s+ops|llmops)\s+engineer\b`,
  String.raw`\bfull[\s-]?stack\b.*\b(ai|llm)\b|\b(ai|llm)\b.*\bfull[\s-]?stack\b`,                                   // Full Stack Engineer (AI)
  String.raw`\b(integrations?|implementation)\s+(engineer|consultant)\b`,                                               // Gulf / fintech / ERP secondary target
  String.raw`\bforward[\s-]?deployed\b|\bFDE\b`,                                                                           // only survives the location gate if worldwide / Gulf / Pakistan
].join('|'), 'i');

// LinkedIn guest search: every keyword runs in every location.
export const LINKEDIN_KEYWORDS = [
  'AI engineer', 'applied AI engineer', 'LLM engineer', 'generative AI engineer', 'AI automation engineer',
  'AI integration engineer', 'full stack AI engineer', 'AI agent engineer', 'implementation engineer', 'integration engineer',
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
