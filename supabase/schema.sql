-- Run once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- This sets up the three tables the app uses.

-- The early landing form wrote to a table called `leads(email, task)`. Inbound
-- submissions now live in `inbound_leads`, and `leads` is reused for campaign
-- recipients. Drop the old table first (it only holds early test rows).
drop table if exists leads cascade;

-- ── INBOUND (public landing form) ───────────────────────────────────
create table if not exists inbound_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  task text,
  status text default 'new',
  created_at timestamptz default now()
);
alter table inbound_leads enable row level security;
-- the public site (anon key) can submit but not read
drop policy if exists "anon insert inbound" on inbound_leads;
create policy "anon insert inbound" on inbound_leads for insert to anon with check (true);
-- you, logged in, can read and update
drop policy if exists "auth read inbound" on inbound_leads;
create policy "auth read inbound" on inbound_leads for select to authenticated using (true);
drop policy if exists "auth update inbound" on inbound_leads;
create policy "auth update inbound" on inbound_leads for update to authenticated using (true) with check (true);

-- ── CAMPAIGNS ───────────────────────────────────────────────────────
create table if not exists campaigns (
  id bigint generated always as identity primary key,
  name text not null,
  goal text,
  icp text,
  platform text default 'email',
  status text default 'draft',
  created_at timestamptz default now()
);
alter table campaigns enable row level security;
-- the admin reads/writes these with the service-role key (bypasses RLS).
-- RLS on with no anon policy means the public anon key cannot touch this table.

-- ── LEADS (campaign recipients) ─────────────────────────────────────
create table if not exists leads (
  id bigint generated always as identity primary key,
  campaign_id bigint references campaigns(id) on delete cascade,
  first_name text,
  email text,
  company text,
  status text default 'new',   -- new | sent | replied | booked | won | lost
  sent_at timestamptz,
  created_at timestamptz default now()
);
alter table leads enable row level security;
-- same as campaigns: service-role only, anon locked out.

-- ── ADMIN USER ──────────────────────────────────────────────────────
-- Create your login: Authentication -> Users -> Add user (email + password,
-- tick "Auto Confirm User"). That account is the only thing that can reach /admin.
-- No public sign-up exists.
