-- Run once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Backs the founder video pipeline (Animations/_founder, /admin/pitches, /v/[slug]).
-- Safe to re-run: every statement is create-if-not-exists.

-- ── FOUNDER VIDEO PITCHES ────────────────────────────────────────────
-- One row per tech company: found by the pitch sourcer, given a custom explainer video about its
-- own product by the local render pipeline, then emailed to the founder from /admin/pitches.
create table if not exists video_pitches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,            -- used in the public link: /v/<slug>
  company text not null,
  website text not null,
  one_liner text,                        -- what the company says it does
  source text,                           -- yc | manual | ...
  founders jsonb default '[]',           -- [{name, title, linkedin}]
  contact_name text,                     -- the founder the email goes to
  contact_email text,
  other_emails text,                     -- other real addresses found, for bounces
  status text default 'new',             -- new | rendering | ready | sent | viewed | replied | skipped | failed
  video_url text,                        -- public 720p mp4 in storage bucket pitch-videos
  video_path text,                       -- storage object path, for clean up
  poster_url text,                       -- first frame image, for the email and the page
  script jsonb,                          -- the scene plan the video was built from
  email_subject text,
  email_body text,
  dm_text text,                          -- LinkedIn connection note, 300 characters max
  notes text,
  views integer default 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  sent_at timestamptz,
  next_followup date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists video_pitches_status_idx on video_pitches (status);
alter table video_pitches enable row level security;
-- read and written server side only (service role key); the anon key is locked out.

-- ── PUBLIC BUCKET FOR THE VIDEOS ─────────────────────────────────────
-- Public so the /v/<slug> page and email clients can stream the mp4 without a login.
-- 720p files of a few MB each; the pipeline deletes unanswered videos after 30 days.
insert into storage.buckets (id, name, public)
values ('pitch-videos', 'pitch-videos', true)
on conflict (id) do nothing;
