// `prospects.notes` is one text column, but the UI treats it as three logical
// parts (plain notes, the drafted DM, and an append-only activity log) since
// there is no separate column for any of them. Delimiters are internal only,
// never shown raw to the user — the page renders each part in its own box.
const DRAFT_MARKER = '\n\n---DM DRAFT---\n';
const LOG_MARKER = '\n\n---ACTIVITY LOG---\n';

export function parseNotes(raw) {
  const text = raw || '';
  const [beforeLog, log = ''] = text.split(LOG_MARKER);
  const [notes = '', draft = ''] = beforeLog.split(DRAFT_MARKER);
  return { notes: notes.trim(), draft: draft.trim(), log: log.trim() };
}

export function combineNotes({ notes, draft, log }) {
  let out = (notes || '').trim();
  if (draft && draft.trim()) out += DRAFT_MARKER + draft.trim();
  if (log && log.trim()) out += LOG_MARKER + log.trim();
  return out;
}

export function appendLogLine(existingLog, line) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const entry = `[${stamp}] ${line}`;
  return existingLog ? `${existingLog}\n${entry}` : entry;
}
