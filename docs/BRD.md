# AI Consultant Web App — Business Requirements Document (BRD)

> Naming note (2026-07-05): "GTM Engine" below was the working title during planning. The business is now **AI Consultant** (see `BusinessOS/protocols/ai-consultant-offer.md`); the app is the AI Consultant web app: public landing + live AI assistant + admin pipeline.

Owner: Anas Qureshi. Draft for approval. Date: 2026-06-30.

## 1. Vision
A self-operated web app that runs Anas's entire client-acquisition motion, inbound and outbound, from one place. It sources prospects, enriches them, helps write and track outreach, and moves each one through a pipeline to a paying client. It doubles as living proof of what Anas sells: he builds AI systems, and the live assistant on the landing page is one of them, running his own business.

## 2. Problem
Right now the motion is scattered: prospects live in a markdown file, outreach copy in a skill, the daily system in another doc, inbound in a form. Nothing connects. There is no single place to source, work, and measure the funnel. That makes the outreach inconsistent and unmeasurable, which is the exact thing that produced a year of no clients.

## 3. Business objectives
1. Land the first paying GTM-engineering client (retainer). This is the only objective that matters short term.
2. Make outreach systematic and measurable so effort turns into a tracked funnel, not random shots.
3. Serve as a portfolio-grade proof asset Anas can show prospects.

## 4. Success metrics (KPIs)
- Leading (controlled, tracked daily): prospects sourced, prospects contacted, follow-ups sent.
- Lagging (judged weekly): replies, calls booked, proposals, clients won.
- North-star: one retainer client. Funnel target to get there, roughly: source 100+ qualified prospects, contact them with follow-ups, book several calls, close one.

## 5. Users
- Primary: Anas (solo admin and operator). Single login. No team.
- Secondary: inbound visitors on the public landing page (they submit, they never log in).

## 6. In scope
- Public landing page with inbound capture.
- Inbound management (review, convert to pipeline).
- Outbound sourcing from multiple cloud-native sources (see PRD sourcing strategy).
- Enrichment (emails, socials, firmographics) where cloud-viable.
- Prospect pipeline / CRM with stages and notes.
- Outreach drafting (wired to the cold-dm skill) and email sending.
- Follow-up reminders.
- Dashboard and funnel analytics.
- Settings for API keys and sending domains.

## 7. Out of scope (honest, on purpose)
- Automated LinkedIn scraping or automated LinkedIn DMs. ToS-banned, gets the account banned. LinkedIn stays a manual step (gather by hand, import, DM by hand).
- Automated Instagram scraping. Fragile, low B2B value, ToS. Skipped.
- Free automated B2B lead sourcing. It does not exist. Good B2B data is either paid (Apollo) or gathered by hand. The engine's source is curated import now, with a paid Apollo API as a later upgrade. Google Places is dropped for this ICP because it returns local businesses, not B2B buyers.
- A general-purpose data platform rivaling Apollo or Clay. That is a separate multi-year product, not a path to the first client.

## 8. Constraints (hard)
- **Vercel-only. Anas will not run anything locally.** Every feature must run in the deployed app. No local workers, no CLI steps. This is the single biggest design driver.
- Backbone is Supabase (Postgres, Auth, RLS) and Vercel serverless. No persistent server, no browser at runtime.
- Cost: prefer free tiers. Paid APIs only where they clearly pay for themselves, and only with Anas's approval and keys.
- Sourcing must be ToS-safe. No scraping of login-walled platforms.
- Solo operator. The UI must be simple enough to run daily without friction.

## 9. Assumptions
- Anas can supply API keys when a feature needs one (Google Places, an email provider, later an email-finder).
- Manual gathering on LinkedIn (just browsing, then pasting a list in) is acceptable and safe.
- Volume is modest (tens to low hundreds of prospects at a time), which fits serverless limits.

## 10. Risks and mitigations
- **Builder trap (highest risk).** Building the engine can become an excuse not to send DMs. Mitigation: the engine is Track 2. Track 1 (actual outreach to real prospects) continues in parallel and takes priority. We ship the engine in thin phases so it is usable early, not after months.
- Data-source fragility and cost. Mitigation: layered sources, start with free paste/import and Google Places free credit; add paid APIs only when justified.
- Email deliverability. Mitigation: dedicated sending domain and warmup, never the main inbox; sending built on a Vercel-friendly provider.
- Scope creep toward "everything." Mitigation: the phased roadmap in the PRD; anything beyond it is a later decision.

## 11. Business rules (locked)
- Outreach copy follows Anas's voice and `Guidelines/nick_coldoutreach_copywriting.md`. No AI-slop, no en or em dashes, connected sentences not fragments.
- Solo voice only. Never "my team" or "we." Never fabricate a story he does not own.
- Never name a past employer's client. Capability and outcomes only.

## 12. High-level roadmap
- Phase 1 (largely done): auth, landing, inbound capture, prospects pipeline, dashboard, paste/CSV import.
- Phase 2: curated import + list-building helper + website enrichment.
- Phase 3: outreach (draft + email send + manual LinkedIn) + follow-up reminders.
- Phase 4: Apollo API sourcing (paid) + email-finder + registries + analytics.

## 13. Approval
Approve this BRD and the PRD, and Anas supplies the Phase 2 keys (Google Places). Then the build proceeds phase by phase, each deployed to Vercel for Anas to test live.
