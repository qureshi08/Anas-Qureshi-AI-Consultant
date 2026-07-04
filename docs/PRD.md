# AI Consultant Web App — Product Requirements Document (PRD)

> Naming note (2026-07-05): "GTM Engine" was the planning-phase working title. Current branding is **AI Consultant** throughout (landing, assistant, admin "HQ"). Offer and ICP per `BusinessOS/protocols/ai-consultant-offer.md`; assistant spec per `docs/assistant-standards.md`.

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

**The hard truth about lead quality.** There is no free, automated, cloud source of high-quality B2B decision-maker leads. If there were, Apollo, ZoomInfo, and Clay would not be businesses. Google Places returns local storefront businesses by category, which is the wrong audience for this ICP (B2B agencies, sales and marketing teams, founders), so Places is dropped here. Good B2B leads come from exactly two places:

- **Curated import (free, best quality, the primary source now, already built).** The right prospects are picked by hand from the best B2B sources (LinkedIn and Sales Navigator browsing, Apollo's free UI, agency and SaaS directories like Clutch and G2, funding and hiring signals), then pasted or uploaded. It is ToS-safe (just browsing), free, and the highest quality because a human chooses each one. Claude builds the target lists (like the 20-agency list already produced), so it is research-assisted, not blind grinding. For landing the first client this is the right and sufficient source: 30 to 50 great prospects beat 500 mediocre ones.
- **Apollo API (paid, the automation upgrade for later).** When volume matters, wire Apollo's API for one-click B2B sourcing by title, industry, and company size, straight into the pipeline. This is the honest cost of automated good data. It needs a paid Apollo plan, so it is a Phase 4 upgrade, added only once a paying client justifies it.

**Website enrichment (free, on Vercel).** Once companies are in, a server-side fetch of each site pulls emails and social links. Applies to any source.

**Explicitly excluded:** Google Places for this B2B ICP (wrong audience; it stays available only if Anas ever targets local businesses), and all LinkedIn and Instagram scraping (ToS, account-ban risk).

Sourcing principle: curated import is the engine now; Apollo is the paid accelerator later. The engine ingests good leads the moment you paste them.

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
- F4a. Curated import (done, primary). Paste or CSV of hand-picked prospects becomes rows with source = import, deduped by website or name. A "build a target list" helper (Claude research) produces the list to paste. Acceptance: a curated list becomes prospects with no duplicates.
- F4b. Apollo API sourcing (Phase 4, paid). A Source box: title + industry + company size + geo. Calls Apollo, dedupes, inserts with source = apollo. Acceptance: a search fills the pipeline with real B2B decision-makers. Gated behind a paid Apollo key.
- F4c. Website enrichment (free). A button on a prospect (and a bulk action) fetches the site and fills email and socials where found. Acceptance: a prospect with a website gains an email when the site exposes one.

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
- **Phase 2:** F4a import polish + dedupe + a list-building helper, F4c website enrichment, F3 inbound-to-prospect. No key needed.
- **Phase 3:** F8 outreach (draft + email send + manual DM copy), F Activities history, F9 follow-ups. Needs an email provider key + a sending domain.
- **Phase 4:** F4b Apollo API sourcing (paid), F5 email-finder, F6 segmentation, deeper F10 analytics.

## 9. Testing and acceptance
Anas tests each phase on the live Vercel URL. A phase is accepted when its acceptance criteria pass in the deployed app.

## 10. Decisions and inputs needed from Anas
1. Nothing blocks Phase 2. The source is curated import (built) plus free website enrichment, and Claude builds the target lists with you.
2. Email sending provider for Phase 3. Recommendation: Resend (works on Vercel, free tier), plus a dedicated sending domain to protect deliverability.
3. Phase 4 only, and only if you want automated sourcing at volume: a paid Apollo plan + API key. Skip until a client is paying.

## 11. Approval
On approval of this PRD and the BRD, the build proceeds Phase 2 onward. Phase 1 cleanup happens first so the base is clean.
