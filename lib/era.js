// Single source of truth for the ICP-era split.
//
// The ICP has switched twice. PIVOT: recruiting/staffing -> marketing agencies
// (goal.md 2026-08-21). PIVOT_2: marketing agencies -> AI WhatsApp receptionist,
// Gulf/Pakistan (goal.md 2026-08-27, BusinessOS/protocols/hormozi-reframe-audit-2026-08-27.md).
// Every admin page defaults to the current era so the live test is judged on
// its own numbers; the archive views keep the full history. Nothing is ever
// deleted. A future ICP switch adds a new pivot here, not a per-page hack.

export const PIVOT = '2026-08-21';
export const PIVOT_2 = '2026-08-27';

export const ERAS = ['current', 'marketing', 'recruiting', 'all'];

export const ERA_LABEL = {
  current: `Current test · WhatsApp receptionist (Gulf/Pakistan) · since ${PIVOT_2}`,
  marketing: `Archive · marketing/digital agencies · ran ${PIVOT} to ${PIVOT_2}`,
  recruiting: `Archive · recruiting/staffing · retired ${PIVOT}`,
  all: 'All time · every era blended',
};

export function resolveEra(q) {
  return ERAS.includes(q) ? q : 'current';
}

// Prospects carry their send date as a [YYYY-MM-DD] tag inside notes (written
// by the update actions); untouched prospects fall back to created_at.
const NOTE_DATE = /\[(\d{4}-\d{2}-\d{2})\]/;
export function prospectDate(p) {
  const m = NOTE_DATE.exec(p.notes || '');
  return m ? m[1] : (p.created_at || '').slice(0, 10);
}

// Leads: sent date when sent, else the date they were loaded.
export function leadDate(l) {
  return (l.sent_at || l.created_at || '').slice(0, 10);
}

// True only for the live, current-test era (WhatsApp receptionist onward).
// Kept for back-compat with call sites that just need a current/not-current check.
export const isCurrentDate = (d) => d >= PIVOT_2;

// Which of the three discrete eras a date falls in. Missing dates sort into
// the oldest era on purpose: the earliest dataset is recruiting-era, so an
// undated row is far more likely old than new.
export function dateEra(d) {
  if (!d) return 'recruiting';
  if (d >= PIVOT_2) return 'current';
  if (d >= PIVOT) return 'marketing';
  return 'recruiting';
}

export function inEra(era, d) {
  if (era === 'all') return true;
  return dateEra(d) === era;
}

// A campaign belongs to the era it was created in.
export function campaignEra(c) {
  return dateEra((c.created_at || '').slice(0, 10));
}
