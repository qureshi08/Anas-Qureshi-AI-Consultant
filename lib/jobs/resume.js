// Standard application form fields, copied into ATS forms with one click on /admin/jobs.
// Every value is true today. Notice period stays a placeholder until Anas states it.
export const RESUME_FILES = {
  // No static PDF for the Applied AI Engineer variant: every application gets the tailored PDF
  // built per job (/api/jobs/resume), which is the one that is emailed and uploaded.
  ai: { label: 'AI Automation Engineer', path: '/resume/Muhammad_Anas_AI_Automation_Engineer.pdf' },
  data: { label: 'Data Analytics Engineer', path: '/resume/Muhammad_Anas_Data_Analytics_Engineer.pdf' },
};
export const ANSWERS = [
  ['Full name', 'Muhammad Anas'],
  ['Email', 'muhammadanasq@gmail.com'],
  ['Phone', '+92 302 9222402'],
  ['LinkedIn', 'https://linkedin.com/in/anasqureshiai'],
  ['Portfolio / website', 'https://anas-qureshi-ai-consultant.vercel.app'],
  ['Location', 'Islamabad, Pakistan (UTC+5)'],
  ['Current title', 'AI Consultant, Convergent Business Technologies (2024 to present)'],
  ['Years of experience', '2'],
  ['Education', 'BSc Computer Science, Iqra University Islamabad, 2019 to 2023'],
  ['Work authorization', 'Pakistani national. For remote roles, hired as a contractor or through an employer of record (Deel, Remote, Oyster). No sponsorship needed for remote; for Gulf onsite roles a sponsored employment visa is required.'],
  ['Notice period', 'FILL IN, not set yet (ask Anas)'],
  ['Salary, USD remote', '$2,000 to $3,500 per month depending on scope, negotiable for a long term role'],
  ['Salary, Pakistan', 'PKR 300,000 to 450,000 per month'],
  ['Salary, Gulf', 'AED 8,000 to 14,000 per month, or SAR equivalent'],
  ['Time zone overlap', 'Full overlap with Gulf hours, UK and EU mornings to mid afternoon, US East Coast mornings'],
  ['Headline', 'Applied AI Engineer | LLM Features, Integrations and Multi Tenant Backends | Python, TypeScript, Next.js, NestJS'],
  ['Short bio (3 lines)', 'AI Consultant at Convergent Business Technologies since 2024, shipping AI features, integrations and multi tenant backends into client systems in banking, retail, marketing analytics and higher education: a ZATCA e invoicing gateway for a Middle East bank, a NestJS backend with Microsoft Entra ID and row level security, and an AI recruitment portal that screens resumes with Gemini.'],
];

// The only allowed source of facts for cover notes and DMs. Mirrors Jobs/resume/resume_source.md
// in the main workspace. If the resume changes there, change it here in the same commit.
export const RESUME_TEXT = `Muhammad Anas

Applied AI Engineer | LLM Features, Integrations and Multi Tenant Backends | Python, TypeScript, Next.js, NestJS

muhammadanasq@gmail.com | +92 302 9222402 | linkedin.com/in/anasqureshiai | anas-qureshi-ai-consultant.vercel.app
Based in Islamabad, Pakistan (UTC+5).

Summary

AI Consultant at Convergent Business Technologies since 2024, shipping AI features, integrations and multi tenant backends into client systems in banking, retail, marketing analytics and higher education.
Built a ZATCA Phase 2 e invoicing gateway for a Middle East bank (all 6 ZATCA APIs, ECDSA signing, hash chaining), the NestJS backend of a marketing mix modeling platform with Microsoft Entra ID and row level security, and an AI recruitment portal that screens resumes with Gemini. Earlier, an AI assisted retail reporting pipeline for UAE and KSA cut the monthly cycle from 7 days to about 2 hours.

Skills

Programming: Python, TypeScript, SQL, FastAPI, NestJS, Next.js, React
AI and Automation: LLM features and workflow automation, Gemini API including vision, RAG and prompt pipelines, AI agents, n8n, API integration
Backend and Data: PostgreSQL with row level security, multi tenant design, TypeORM, Supabase, ETL data pipelines, relational SQL database design
Auth, Security and Compliance: Microsoft Entra ID (OAuth tokens), email OTP second factor, role based access control, ECDSA signing and SHA 256 hashing, ZATCA Phase 2 e invoicing
Cloud and Tools: Docker, Git, Vercel, Render, Cloudflare R2, QStash, Postman, Jest, Odoo, Zoho
BI: Tableau, Power BI, Microsoft Excel
Practices: Test strategy and QA, technical documentation (C4 models, API references), requirement gathering, working with business, audit and IT teams

Experience

Convergent Business Technologies, Pakistan | AI Consultant | 2024 to present

- Build AI features, integrations and backends for client products in banking, retail, marketing analytics and higher education
- Implemented AI assisted workflow automation using LLMs and n8n, reducing processing time by 60 to 75 percent
- Developed automated ETL pipelines using Python, SQL and Excel, and designed centralized SQL databases to remove version conflicts
- Built dashboards and reports using Tableau and Power BI
- Wrote architecture documents, API references and test plans, and collaborated with business, audit and IT teams to ensure system traceability

Projects

ZATCA Phase 2 E Invoicing Gateway and Middleware, Banking and ERP | 2026

Stack: TypeScript, Next.js, node forge, xmlbuilder2, Supabase, QStash, Vercel, Odoo, Zoho

- Built a ZATCA Phase 2 e invoicing gateway for a Middle East bank, implementing all 6 ZATCA APIs: compliance CSID, compliance invoice checks, production CSID, clearance, reporting and renewal
- Implemented UBL 2.1 invoice XML, ECDSA secp256k1 signing, SHA 256 invoice hash chaining and QR code generation, and fixed double hashing and previous invoice hash encoding bugs
- Designed a multi bank isolated architecture, then extended it into a multi tenant middleware for Odoo and Zoho with a headless OpenAPI and pluggable adapters
- Wrote the C4 architecture model and developer and user manuals; launched and deployed for use

Marketing Mix Modeling Platform, Backend | 2026

Stack: NestJS, TypeScript, PostgreSQL, TypeORM, Microsoft Entra ID, Cloudflare R2, Render

- Built the NestJS backend of a multi tenant marketing mix modeling platform in a four person team, owning authentication, data, uploads and model orchestration APIs
- Implemented Microsoft Entra ID token authentication, email OTP as a second factor, and invite only projects with three tier permissions
- Designed multi tenant PostgreSQL with row level security and separate app and admin database roles, managed through TypeORM migrations
- Integrated two modeling engines, Google Meridian and PyMC Marketing, through train, status and results endpoints, plus data quality checks, channel health, exposure metrics and collinearity checks with a ridge fallback
- Wrote the API reference, architecture document and Postman collection; 156 commits, all 26 backend test cases passing

AI Recruitment Portal, Full Stack | 2025 to 2026

Stack: Next.js, TypeScript, Tailwind CSS, Supabase, Gemini API, Vercel

- Built and own a production recruitment portal for a graduate academy program, from application to assessment
- Screens resumes with Gemini 2.0 Flash against admin defined criteria, using vision for image only PDFs
- Implemented role based access for four roles, Microsoft corporate sign in, assessment slot booking, a reapply cooldown and audit logging

PepsiCo Retail Analytics, UAE and KSA | 2024

Stack: Python, Tableau, Gemini, Docker, Excel

- Built an end to end monthly reporting pipeline for UAE and KSA retail data, harmonizing SKU level sales, quantity, volume, manufacturer and competitor detail across 13 retailers into one role based platform
- Automated SKU matching using Python and AI assisted logic as one step in the pipeline, reducing matching time from 80 minutes to 40 seconds per 100 SKUs, accuracy up from 70 to 95 percent
- Automated the full monthly refresh, database push, Tableau dashboard rebuild and Excel report generation, with all numbers validated automatically before delivery
- Cut the full monthly reporting cycle from 7 days to about 2 hours, and data validation turnaround from 3 days to 1

QA and UAT Lead, US Higher Education Data Portal | 2026

Stack: Test strategy, test case design, defect tracking, role based access testing

- Led black box QA and user acceptance testing for a data submission portal used by a consortium of US private colleges
- Wrote the test strategy, requirements traced from the RFP, severity definitions and 78 test cases, including role based access and cross institution data isolation tests
- Ran 60 test cases and logged 15 defects with developer handoff documents, with no high priority defects left open

CBT Recruitment Workflow Automation | 2024

Stack: Python, Notion, n8n, LLMs

- Consolidated multiple recruitment workflows into a single Notion based platform
- Automated candidate assessment steps using workflow automation and LLMs, reducing coordination time by 60 percent
- Piloted AI agents for repetitive tasks, reducing average response time by 2 days

ZTBL Credit Risk Model Automation | 2025

Stack: Python, SQL, Docker, Excel

- Automated 20+ Excel based PD, LGD, EAD and ECL models using Python and SQL, reducing manual effort by about 75 percent
- Designed and deployed a relational SQL database to centralize inputs, eliminating version conflicts

Company Website and Internal Portal | 2026

Stack: Next.js, React, Supabase, Resend

- Built the company website on a central design system with four audience entry points and routed lead forms
- Started an internal engagement portal, building the wallet and shop, notification engine and feedback module before handing it over

Independent: live AI assistant and outreach engine | 2026

Stack: Next.js, Supabase, Vercel, Python, Node.js

- Built and run a live AI assistant with an admin pipeline at anas-qureshi-ai-consultant.vercel.app
- Built a lead generation and outreach engine: public page scraping in Python, email extraction and validation with bounce handling, LLM personalization and automated sequencing

Education

Iqra University, Islamabad | Bachelor of Science, Computer Science | 2019 to 2023
`;
