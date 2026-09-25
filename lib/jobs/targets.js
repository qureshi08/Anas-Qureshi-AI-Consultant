/**
 * What the job stream targets. Locked by Anas 2026-09-25: AI / Solutions Engineer roles only
 * (solutions, sales, forward deployed, implementation, integration and customer engineering),
 * at tech companies, in four location groups: remote worldwide, the US (relocation is fine),
 * Canada / UAE / KSA, and Pakistan onsite or hybrid. At least 50 applications a day.
 *
 * Everything the fetcher searches for and gates on lives here, so a future change of target
 * is one file, not a hunt through regexes.
 */

// Minimum applications per day. The settings page can raise it, never lower it below this.
export const DAILY_GOAL_MIN = 50;

// HARD GATE: a posting's title must match this or it is dropped, whatever else it scores.
// "Relevant roles only" (memory feedback_startups_hard_gates_relevant_only): no fallback rows.
export const TARGET_TITLE_RX = /\b(solutions?|sales|pre ?sales|presales|forward ?deployed|implementation|integrations?|customer|deployment|technical solutions?)[\s-]+(engineer|engineering|architect|consultant)\b|\bsolutions? (engineer|architect|consultant)\b|\bforward deployed\b|\bFDE\b/i;

// LinkedIn guest search: every keyword runs in every location.
export const LINKEDIN_KEYWORDS = [
  'solutions engineer', 'AI solutions engineer', 'sales engineer', 'forward deployed engineer',
  'implementation engineer', 'solutions consultant', 'presales engineer', 'customer engineer',
  'integration engineer', 'technical solutions engineer',
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
