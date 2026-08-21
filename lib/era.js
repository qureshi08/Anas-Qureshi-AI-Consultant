// Single source of truth for the ICP-era split.
//
// The ICP switched on PIVOT (recruiting/staffing -> marketing agencies, see
// goal.md 2026-08-21). Every admin page defaults to the current era so the live
// test is judged on its own numbers; the archive views keep the full history.
// Nothing is ever deleted. A future ICP switch adds a new pivot here, not a
// per-page hack.

export const PIVOT = '2026-08-21';

export const ERAS = ['current', 'recruiting', 'all'];

export const ERA_LABEL = {
  current: `Current test · marketing agencies · since ${PIVOT}`,
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

export const isCurrentDate = (d) => d >= PIVOT;

// Missing dates sort into the old era on purpose: the entire pre-pivot dataset
// is recruiting-era, so an undated row is far more likely old than new.
export function inEra(era, d) {
  if (era === 'all') return true;
  return era === 'current' ? isCurrentDate(d) : !isCurrentDate(d);
}

// A campaign belongs to the era it was created in.
export function campaignEra(c) {
  return isCurrentDate((c.created_at || '').slice(0, 10)) ? 'current' : 'recruiting';
}
