# GTM Engine — Product Requirements Document (PRD)

Owner: Anas Qureshi. Draft for approval. Date: 2026-06-30. Pairs with BRD.md.

## 1. Overview
A single web app (public landing + admin) that runs the whole GTM motion end to end: source, enrich, segment, reach, track, close. Two categories: Inbound and Outbound. Everything runs on Vercel and Supabase. No local machine, no browser at runtime.

## 2. Users and roles
- Admin (Anas): full access behind login. Single account, created in Supabase Auth. No public sign-up.
- Visitor: public landing page only. Can submit the form. No account.

## 3. Architecture
- Frontend + backend: Next.js (App Router) on Vercel. Server Actions for writes. Server Components for reads.
- Database + Auth + Storage: Supabase (Postgres, RLS).
- Two Supabase clients: anon (browser, for the public form and login) and service-role (server-only, for admin reads and writes). Service-role key lives only in Vercel env vars.
- Auth: Supabase email/password. Middleware protects `/admin`.
- Runtime limits to respect: serverless functions are short-lived (seconds) with no persistent browser. Long jobs must be chunked or paged, never a single long-running task.

## 4. Data-entry constraint and sourcing strategy (the important part)
Business data can enter the app only three ways, there is no fourth:
1. A browser scrapes it. Needs a real machine. **Not possible on Vercel.** Excluded.
2. A paid or free-credit data API serves it. Runs on Vercel. Included where it pays off.
3. Paste or CSV import. Free, runs on Vercel. Included, already built.

Given that, the sourcing strategy is layered and multi-source, cloud-native only. Not just Google Maps.

**Tier 1 (build first, free or free-credit):**
- **Paste / CSV import (built).** Universal intake for any list from anywhere. This is also the safe LinkedIn path: Anas gathers names by hand on LinkedIn or Sales Navigator (just browsing, ToS-safe), then pastes the list in and the engine takes over. Also covers purchased lists, event lists, referrals.
- **Google Places API.** Automated sourcing by industry + location. Returns company, website, phone, address, category, rating. Runs on Vercel. Free within Google's monthly credit. This replaces Google Maps scraping. Needs a Places API key from Anas.
- **Website enrichment.** For each prospect with a website, a server-side fetch pulls emails and social links and confirms the niche. Free on Vercel, done in small chunks to respect timeouts.

**Tier 2 (add when justified):**
- **Email-finder API** (Hunter.io or Snov.io). Decision-maker emails from a domain. Free tier first, then paid. Needs a key.
- **Public registries and directories.** OpenCorporates and similar JSON APIs for firmographics; niche directory endpoints via fetch.

**Explicitly excluded:** LinkedIn scraping and Instagram scraping (ToS, account-ban risk), and Google Maps browser scraping (needs a machine).

Sourcing principle: automated intake (Places) plus manual intake (import) feed one prospects table, then enrichment fills gaps, then dedupe, then it enters the pipeline.

## 5. Data model (Supabase tables)
- `inbound_leads`: id, email, task, status, created_at. Anon insert, admin read.
- `prospects`: id, company, contact_name, role, website, linkedin, email, phone, city, niche, source, status (new | connected | contacted | replied | call | won | lost), score, notes, created_at, updated_at. Admin only.
- `activities`: id, prospect_id, type (note | status_change | email_sent | reply), body, created_at. Admin only. (Phase 3, the per-prospect history.)
- `templates`: id, name, channel (dm | email), subject, body, created_at. Admin only. (Phase 3.)
- `settings`: single row, holds non-secret config and which integrations are on. Secrets stay in env vars, never in the table.
- Existing `campaigns` and `leads` (bulk email) stay, tucked away, not the primary flow.
- Drop or ignore: `sourcing_jobs` and the dead worker (the local-worker approach is abandoned).

## 6. Feature modules and requirements

### F1. Auth (done)
Admin login via Supabase. Middleware guards `/admin`. Log out. Acceptance: only the created user reaches `/admin`; everyone else is redirected to `/login`.

### F2. Public landing + inbound capture (done)
The landing page with the free-build offer; the form writes to `inbound_leads`. Acceptance: a submission appears in the admin Inbound list.

### F3. Inbound management
List inbound submissions, mark status, and convert a submission into a prospect with one click. Acceptance: an inbound lead can be pushed into the Outbound pipeline.

### F4. Outbound sourcing
- F4a. Paste / CSV import (done). Acceptance: pasted rows become prospects with source = import.
- F4b. Google Places sourcing. A Source box: market + industry + max results. On submit, a server action calls the Places API, dedupes against existing prospects by website or name, and inserts the new ones with source = places. Acceptance: entering "marketing agencies, Austin" fills the pipeline with real Austin businesses, no duplicates.
- F4c. Website enrichment. A button on a prospect (and a bulk action) fetches the site and fills email and socials where found. Acceptance: a prospect with a website gains an email when the site exposes one.

### F5. Enrichment (Tier 2)
Optional email-finder API to get a decision-maker email from a domain when the site does not expose one. Acceptance: with a key set, a prospect can be enriched with a found email.

### F6. ICP and segmentation
Tag or filter prospects by niche, source, status, score. Simple saved filters. Acceptance: Anas can view "places, marketing agencies, status new."

### F7. Pipeline / CRM (done, extend)
Prospect rows with stage dropdown, contact, linkedin, notes, save. Extend with an activity history per prospect (F Activities). Acceptance: moving a prospect through stages updates the dashboard; each change is logged.

### F8. Outreach
- Draft: a "Draft DM" and "Draft email" button on a prospect that produces copy from the cold-dm skill logic, personalized to that prospect. Copy-to-clipboard for the LinkedIn DM (manual send, ToS-safe).
- Send email: send the drafted email through a Vercel-friendly provider (Resend recommended), from a dedicated warmed domain, logged as an activity. Acceptance: an email can be drafted and sent, and the prospect flips to contacted.

### F9. Follow-ups
Reminders at day 3 and day 7 for contacted prospects with no reply. Shown as a "due today" list on the dashboard. Acceptance: a contacted prospect with no reply shows up in follow-ups after 3 days.

### F10. Dashboard / analytics
Funnel counts by stage, this-week touches, reply rate, calls booked. Acceptance: numbers match the underlying data and update as prospects move.

### F11. Settings
Screen showing which integrations are configured (Places, email provider, email-finder) based on env vars, with setup instructions. Secrets are never displayed. Acceptance: Anas can see at a glance what is wired.

## 7. Non-functional requirements
- Security: RLS on all tables; service-role key server-only; no secret in the client or repo.
- Performance: all sourcing and enrichment chunked to fit serverless timeouts.
- Cost: free tiers by default; paid APIs gated behind Anas's keys and approval.
- Reliability: every external API call wrapped with error handling and a clear message in the UI.
- Brand: admin uses the Paper and Punch styling already in `globals.css`.

## 8. Build phases (each deployed to Vercel to test live)
- **Phase 1 (done):** F1, F2, F4a, F7, F10 (basic), Inbound/Outbound split. Cleanup: remove dead worker and `sourcing_jobs`, retire the unused seed.
- **Phase 2:** F4b Google Places sourcing, F4c website enrichment, F3 inbound-to-prospect. Needs the Places key.
- **Phase 3:** F8 outreach (draft + email send + manual DM copy), F Activities history, F9 follow-ups. Needs an email provider key + a sending domain.
- **Phase 4:** F5 email-finder, F6 segmentation, deeper F10 analytics, public registries.

## 9. Testing and acceptance
Anas tests each phase on the live Vercel URL. A phase is accepted when its acceptance criteria pass in the deployed app.

## 10. Decisions and inputs needed from Anas
1. Google Places API key (for Phase 2 automated sourcing). Free within Google's monthly credit.
2. Email sending provider for Phase 3. Recommendation: Resend (works on Vercel, free tier), plus a dedicated sending domain to protect deliverability.
3. Later: an email-finder key (Hunter.io or Snov.io) for Phase 4, only if website enrichment is not enough.

## 11. Approval
On approval of this PRD and the BRD, the build proceeds Phase 2 onward. Phase 1 cleanup happens first so the base is clean.
