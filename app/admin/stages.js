// Cold DM pipeline stages, modeled on actual LinkedIn outreach mechanics
// (locked 2026-08-13, replacing the old generic new/connected/replied/call/won/lost set).
export const STAGES = [
  'new',
  'request_sent_no_note',
  'request_sent_with_note',
  'connected',
  'dm_sent',
  'dm_read',
  'replied',
  'call',
  'won',
  'lost',
];

export const STAGE_LABEL = {
  new: 'New',
  request_sent_no_note: 'Request Sent (no note)',
  request_sent_with_note: 'Request Sent (w/ note)',
  connected: 'Connected',
  dm_sent: 'DM Sent',
  dm_read: 'DM Read',
  replied: 'Replied',
  call: 'Call Booked',
  won: 'Won',
  lost: 'Lost',
};

export const STAGE_COLOR = {
  new: 'var(--ink3)',
  request_sent_no_note: 'var(--amber)',
  request_sent_with_note: 'var(--amber)',
  connected: 'var(--forest)',
  dm_sent: 'var(--forest)',
  dm_read: 'var(--forest)',
  replied: 'var(--forest)',
  call: 'var(--forest)',
  won: 'var(--forest)',
  lost: 'var(--ink3)',
};
