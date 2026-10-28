-- Click and go referrals (2026-10-28). Anas asked for zero research on his side: the site ranks the
-- companies by fit, finds the people, and writes each message; he only clicks.
-- fit: 3 strong, 2 good (often Arabic or more years asked), 1 stretch. Set from the 2026-10-27 research.
alter table job_plan_companies add column if not exists fit int;
alter table job_plan_companies add column if not exists fit_note text;

-- People found by public search for each target company. status: new -> requested (connection
-- request sent, no note, because free LinkedIn caps notes) -> messaged (counts as contacted) or skipped.
create table if not exists job_plan_suggestions (
  id uuid primary key default gen_random_uuid(),
  company_id text references job_plan_companies(id) on delete cascade,
  company text,
  name text not null,
  title text,
  url text unique,
  message text,
  status text not null default 'new',
  requested_on date,
  created_at timestamptz default now()
);
alter table job_plan_suggestions enable row level security;
