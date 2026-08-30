-- Run once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Backs the WhatsApp demo receptionist webhook (app/api/whatsapp/webhook/route.js).
-- Safe to re-run: every statement is create-if-not-exists.

-- ── WHATSAPP DEMO CONVERSATIONS ──────────────────────────────────────
create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  wa_id text unique not null,       -- the sender's WhatsApp number, no plus sign
  name text,                        -- WhatsApp profile name, if Meta sends one
  business text,                    -- what business they said they run, once known
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table whatsapp_conversations enable row level security;
-- written server-side by the webhook (service-role key); anon locked out.

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  role text,                        -- user | assistant
  content text,
  created_at timestamptz default now()
);
alter table whatsapp_messages enable row level security;
