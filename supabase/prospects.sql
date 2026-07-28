-- Run once in the Supabase SQL Editor (after schema.sql).
-- Creates the prospects table and seeds your first 20 agencies.

create table if not exists prospects (
  id bigint generated always as identity primary key,
  company text not null,
  contact_name text,
  website text,
  linkedin text,
  niche text,
  source text,
  status text default 'new',   -- new | contacted | replied | call | won | lost
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table prospects enable row level security;
-- admin reads/writes via service-role (bypasses RLS); anon is locked out.

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists prospects_updated_at on prospects;
create trigger prospects_updated_at before update on prospects
for each row execute function set_updated_at();

-- Seed the first 20 (only if the table is empty, so it is safe to re-run).
insert into prospects (company, contact_name, website, niche, source, status)
select company, contact_name, website, niche, 'first-batch-agencies', 'new'
from (values
  ('OutreachBloom', null::text, 'outreachbloom.com', 'Done-for-you cold email for founders'),
  ('OneAway', null::text, 'oneaway.io', 'Deliverability-first cold email + LinkedIn'),
  ('Hypergen', null::text, 'hypergen.io', 'Clay-powered, signal-based lead gen'),
  ('Beanstalk Consulting', null::text, 'beanstalkconsulting.co', 'Books meetings for B2B SaaS'),
  ('NerdyJoe', null::text, 'nerdyjoe.com', 'Human-written cold emails'),
  ('Growth Rhino', null::text, 'growthrhino.com', 'Messaging/channel tests for startups'),
  ('ColdIQ', null::text, 'coldiq.com', 'Intent-driven personalization at scale'),
  ('SalesBread', 'Jack Reamer', 'salesbread.com', 'Ultra-personalized LinkedIn + email'),
  ('LevelUp Leads', null::text, 'levelupleads.io', 'Founder-led, technical/SaaS buyers'),
  ('Klean Leads', null::text, 'kleanleads.com', 'Lead quality + verification'),
  ('Pipeful', null::text, 'pipeful.io', 'Cold email for B2B SaaS'),
  ('Revboss', null::text, 'revboss.com', 'Structured outreach + CRM backend'),
  ('Addlium', null::text, 'addlium.com', 'Multilingual LinkedIn outreach (EU)'),
  ('CleverViral', null::text, 'cleverviral.com', 'Cold email copywriting'),
  ('Leadium', null::text, 'leadium.com', 'Founder-led omnichannel outreach'),
  ('Growth.cx', null::text, 'growth.cx', 'Built by founders, for founders, B2B'),
  ('Instream Group', null::text, 'instreamgroup.com', 'Cold email across 40+ markets'),
  ('Leads Monky', null::text, 'leadsmonky.com', 'Results-guarantee cold email'),
  ('IntentSignal', null::text, 'intentsignal.io', 'Intent-based outreach'),
  ('Respona', null::text, 'respona.com', 'Publisher / link-building outreach')
) as v(company, contact_name, website, niche)
where not exists (select 1 from prospects);
