// External benchmarks, so "working" and "not working" are judgements against
// the market rather than against a feeling. Researched 2026-08-15.
//
// Sources:
//   Cold email reply/bounce — Cleanlist 2026 response-rate study, Snov.io 2026
//     cold email statistics, Agentic Demand B2B outbound benchmarks 2026.
//   LinkedIn acceptance/reply — Expandi 2026 (13.2M data points), Overloop 2026
//     LinkedIn outreach benchmarks, Belkins 2026 LinkedIn outreach study.
//
// Re-verify these yearly. Deliverability and platform behaviour move fast, and a
// stale benchmark is worse than none because it licenses the wrong decision.
export const BENCH = {
  emailReply:  { avg: 3.43, good: 5, strong: 8, unit: '%', label: 'B2B cold email reply rate' },
  emailBounce: { avg: 7, good: 2, best: 1, unit: '%', label: 'cold email bounce rate', lowerIsBetter: true },
  liAccept:    { avg: 29, personalized: 45, generic: 15, unit: '%', label: 'LinkedIn connection acceptance' },
  liReply:     { avg: 10.4, icp: 18.9, unit: '%', label: 'LinkedIn post-connection reply' },
};

// Recruiting/staffing (the prior ICP) benchmarked as the highest-replying
// vertical measured (18.9% vs a 10.4% all-industry average), yet still
// produced 3 real replies across 518+ touches, all negative, two rejecting
// the specific AI-screening feature. Retired 2026-08-21, see goal.md and
// failure-archaeology. No vertical-specific benchmark has been researched
// yet for the current ICP (marketing/digital agencies), so this note is
// honestly "no data" rather than reusing the old, no-longer-relevant number.
export const ICP_NOTE = 'No vertical-specific reply-rate benchmark exists yet for marketing/digital agencies. Judge this ICP on its own numbers as they come in, not on the retired recruiting/staffing figure.';

/**
 * With zero successes in n trials, the 95% upper bound on the true rate is
 * about 3/n (the "rule of three"). This is the honest way to answer "is this
 * a real signal or just a small sample" without pretending to more precision
 * than the data carries.
 */
export function zeroCeiling(n) {
  if (!n) return null;
  return (3 / n) * 100;
}

/**
 * Probability of observing zero successes across n trials if the true rate
 * were the benchmark. A small number means the silence is unlikely to be luck.
 */
export function pZeroAtBenchmark(n, benchPct) {
  if (!n) return null;
  return Math.pow(1 - benchPct / 100, n);
}

/**
 * Verdicts. Systems are judged on whether they run. Strategy is judged only
 * against a benchmark, and can never be locked on taste alone.
 *   locked  - a mechanism, proven to work, deliberately frozen
 *   working - a mechanism that runs, not yet worth freezing
 *   over    - strategy measurably beating benchmark. THE ONLY WAY strategy locks.
 *   at      - strategy sitting at benchmark
 *   under   - strategy measurably below benchmark. Change it.
 *   bet     - strategy with no data yet. Cannot be locked, cannot be condemned.
 *   none    - never run, no data of any kind
 */
export const VERDICT = {
  locked:  { label: 'LOCKED · SYSTEM',  fill: 'var(--forest-fill)', line: 'var(--forest)' },
  working: { label: 'RUNNING · SYSTEM', fill: 'var(--forest-fill)', line: 'var(--forest)' },
  over:    { label: 'BEATING BENCHMARK', fill: 'var(--forest-fill)', line: 'var(--forest)' },
  at:      { label: 'AT BENCHMARK',     fill: 'var(--amber-fill)',  line: 'var(--amber)' },
  under:   { label: 'BELOW BENCHMARK',  fill: 'var(--brick-fill)',  line: 'var(--brick)' },
  bet:     { label: 'UNPROVEN BET',     fill: 'var(--amber-fill)',  line: 'var(--amber)' },
  none:    { label: 'NEVER RUN',        fill: 'none',               line: 'var(--ink3)' },
};
