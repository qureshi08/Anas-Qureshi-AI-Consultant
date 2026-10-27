-- Track 1 referrals-first plan (locked 2026-10-27, Jobs/PLAN_2026-10-27.md).
-- job_plan_companies: the researched Saudi target list, each with a live posting as proof they hire.
-- job_plan_contacts: people Anas messages at those companies, one date per stage for the weekly count.
-- Service role only (admin client), like prospects.
create table if not exists job_plan_companies (
  id text primary key,
  name text not null,
  segment text,
  city text,
  role text,
  url text,
  posted text,
  why text,
  want int,
  reach int,
  created_at timestamptz default now()
);
alter table job_plan_companies enable row level security;

create table if not exists job_plan_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  tie text,
  link text,
  contacted_on date,
  replied_on date,
  call_on date,
  referral_on date,
  interview_on date,
  offer_on date,
  followed_up_on date,
  notes text,
  created_at timestamptz default now()
);
alter table job_plan_contacts enable row level security;
