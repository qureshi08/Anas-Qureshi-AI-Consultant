/**
 * Anas's resume as structured data. The per job tailored resume is rendered FROM THIS FILE:
 * the model may only reorder blocks, choose which to include, and write the summary. It can
 * never write a bullet, so a tailored resume cannot contain an invented fact.
 * Source of truth: Jobs/resume/resume_source.md in the main workspace.
 */
export const CONTACT = {
  name: 'Anas Qureshi',   // professional name; legal name Muhammad Anas goes on forms that ask for it
  email: 'muhammadanasq@gmail.com',
  phone: '+92 302 9222402',
  linkedin: 'linkedin.com/in/anasqureshiai',
  site: 'anas-qureshi-ai-consultant.vercel.app',
  location: 'Islamabad, Pakistan',
};

export const HEADLINES = {
  // Default since 2026-09-26: Applied AI Engineer (key stays 'se' so stored rows and code keep working).
  se: 'Applied AI Engineer | LLM Features, Integrations and Multi Tenant Backends | Python, TypeScript, Next.js, NestJS',
  ai: 'AI Automation Engineer | Python, n8n, LLM Workflows, API Integrations, Data Pipelines',
  data: 'Data and Analytics Engineer | Python, SQL, ETL Pipelines, Tableau, Power BI',
};

// Every skill Anas can truthfully claim. The model picks which to lead with, nothing else.
export const SKILLS = {
  Programming: ['Python', 'TypeScript', 'SQL', 'FastAPI', 'NestJS', 'Next.js', 'React'],
  'AI and Automation': ['LLM features and workflow automation', 'generative AI and LLMs', 'Gemini API including vision', 'RAG and prompt pipelines', 'AI agents', 'n8n', 'API integration'],
  'Backend and Data': ['PostgreSQL with row level security', 'multi tenant design', 'TypeORM', 'Supabase', 'ETL data pipelines', 'relational SQL database design'],
  'Auth, Security and Compliance': ['Microsoft Entra ID', 'OAuth', 'email OTP second factor', 'role based access control', 'ECDSA signing', 'ZATCA e invoicing integration'],
  'Cloud and Tools': ['Docker', 'Git', 'Vercel', 'Render', 'Cloudflare R2', 'QStash', 'Postman', 'Jest', 'Odoo', 'Zoho', 'Notion'],
  BI: ['Tableau', 'Power BI', 'Microsoft Excel'],
  Practices: ['test strategy and QA', 'technical documentation', 'C4 architecture models', 'requirement gathering'],
};

export const EXPERIENCE = {
  company: 'Convergent Business Technologies, Pakistan',
  title: 'AI Consultant',
  dates: '2024 to present',
  bullets: [
    'Build AI features, integrations and backends for client products in banking, retail, marketing analytics and higher education',
    'Implemented AI assisted workflow automation using LLMs and n8n, reducing processing time by 60 to 75 percent',
    'Developed automated ETL pipelines using Python, SQL and Excel, and designed centralized SQL databases to remove version conflicts',
    'Built dashboards and reports using Tableau and Power BI',
    'Wrote architecture documents, API references and test plans, and collaborated with business, audit and IT teams to ensure system traceability',
  ],
};

// Every bullet below is traced to Anas's own work files (survey of his work folder, 2026-09-26). The bank
// stays unnamed (internal use only); NCICU is named with Anas's approval (2026-09-26). Source of truth: Jobs/resume/resume_source.md.
export const PROJECTS = [
  {
    id: 'zatca', name: 'ZATCA Phase 2 E Invoicing Gateway and Middleware, Banking and ERP', year: '2026',
    stack: 'TypeScript, Next.js, node forge, xmlbuilder2, Supabase, QStash, Vercel, Odoo, Zoho',
    tags: 'api integration compliance banking fintech erp odoo zoho invoicing cryptography multi tenant saas typescript nextjs',
    bullets: [
      'Built a ZATCA Phase 2 e invoicing gateway for a Middle East bank, implementing all 6 ZATCA APIs: compliance CSID, compliance invoice checks, production CSID, clearance, reporting and renewal',
      'Implemented UBL 2.1 invoice XML, ECDSA secp256k1 signing, SHA 256 invoice hash chaining and QR code generation, and fixed double hashing and previous invoice hash encoding bugs',
      'Designed a multi bank isolated architecture, then extended it into a multi tenant middleware for Odoo and Zoho with a headless OpenAPI and pluggable adapters',
      'Wrote the C4 architecture model and developer and user manuals; launched and deployed for use',
    ],
  },
  {
    id: 'mmm', name: 'Marketing Mix Modeling Platform, Backend', year: '2026',
    stack: 'NestJS, TypeScript, PostgreSQL, TypeORM, Microsoft Entra ID, Cloudflare R2, Render',
    tags: 'backend nestjs typescript postgres rls multi tenant auth entra oauth api ml integration python data quality saas',
    bullets: [
      'Built the NestJS backend of a multi tenant marketing mix modeling platform in a four person team, owning authentication, data, uploads and model orchestration APIs',
      'Implemented Microsoft Entra ID token authentication, email OTP as a second factor, and invite only projects with three tier permissions',
      'Designed multi tenant PostgreSQL with row level security and separate app and admin database roles, managed through TypeORM migrations',
      'Integrated two modeling engines, Google Meridian and PyMC Marketing, through train, status and results endpoints, plus data quality checks, channel health, exposure metrics and collinearity checks with a ridge fallback',
      'Wrote the API reference, architecture document and Postman collection; 156 commits, all 26 backend test cases passing',
    ],
  },
  {
    id: 'portal', name: 'AI Recruitment Portal, Full Stack', year: '2025 to 2026',
    stack: 'Next.js, TypeScript, Tailwind CSS, Supabase, Gemini API, Vercel',
    tags: 'fullstack nextjs typescript supabase llm gemini vision screening rbac auth product ai',
    bullets: [
      'Built and own a production recruitment portal for a graduate academy program, from application to assessment',
      'Screens resumes with Gemini 2.0 Flash against admin defined criteria, using vision for image only PDFs',
      'Implemented role based access for four roles, Microsoft corporate sign in, assessment slot booking, a reapply cooldown and audit logging',
    ],
  },
  {
    id: 'pepsico', name: 'PepsiCo Retail Analytics, UAE and KSA', year: '2024',
    stack: 'Python, Tableau, Gemini, Docker, Excel',
    tags: 'llm data analytics tableau dashboards docker accuracy pipeline retail reporting matching',
    bullets: [
      'Built an end to end monthly reporting pipeline for UAE and KSA retail data, harmonizing SKU level sales, quantity, volume, manufacturer and competitor detail across 13 retailers into one role based platform',
      'Automated SKU matching using Python and AI assisted logic as one step in the pipeline, reducing matching time from 80 minutes to 40 seconds per 100 SKUs, accuracy up from 70 to 95 percent',
      'Automated the full monthly refresh, database push, Tableau dashboard rebuild and Excel report generation, with all numbers validated automatically before delivery',
      'Cut the full monthly reporting cycle from 7 days to about 2 hours, and data validation turnaround from 3 days to 1',
    ],
  },
  {
    id: 'qa', name: 'QA and UAT Lead, NCICU Data Portal (North Carolina Independent Colleges and Universities)', year: '2026',
    stack: 'Test strategy, test case design, defect tracking, role based access testing',
    tags: 'qa testing uat test strategy rbac data isolation documentation education',
    bullets: [
      'Led black box QA and user acceptance testing for the NCICU data portal, where 36 private colleges submit aggregate and student level data for review and approval',
      'Wrote the test strategy, requirements traced from the RFP, severity definitions and 78 test cases, including role based access and cross institution data isolation tests',
      'Ran 60 test cases and logged 15 defects with developer handoff documents, with no high priority defects left open',
    ],
  },
  {
    id: 'recruiting_automation', name: 'CBT Recruitment Workflow Automation', year: '2024',
    stack: 'Python, Notion, n8n, LLMs',
    tags: 'automation n8n llm agents workflow recruiting notion',
    bullets: [
      'Consolidated multiple recruitment workflows into a single Notion based platform',
      'Automated candidate assessment steps using workflow automation and LLMs, reducing coordination time by 60 percent',
      'Piloted AI agents for repetitive tasks, reducing average response time by 2 days',
    ],
  },
  {
    id: 'ztbl', name: 'ZTBL Credit Risk Model Automation', year: '2025',
    stack: 'Python, SQL, Docker, Excel',
    tags: 'python sql modelling finance risk excel automation database banking',
    bullets: [
      'Automated 20+ Excel based PD, LGD, EAD and ECL models using Python and SQL, reducing manual effort by about 75 percent',
      'Designed and deployed a relational SQL database to centralize inputs, eliminating version conflicts',
    ],
  },
  {
    id: 'web', name: 'Company Website and Internal Portal', year: '2026',
    stack: 'Next.js, React, Supabase, Resend',
    tags: 'fullstack nextjs react web design system product frontend',
    bullets: [
      'Built the company website on a central design system with four audience entry points and routed lead forms',
      'Started an internal engagement portal, building the wallet and shop, notification engine and feedback module before handing it over',
    ],
  },
  {
    id: 'consultant', name: 'Independent: live AI assistant and outreach engine', year: '2026',
    stack: 'Next.js, Supabase, Vercel, Python, Node.js',
    tags: 'llm assistant agent scraping outreach automation product saas',
    bullets: [
      'Built and run a live AI assistant with an admin pipeline at anas-qureshi-ai-consultant.vercel.app',
      'Built a lead generation and outreach engine: public page scraping in Python, email extraction and validation with bounce handling, LLM personalization and automated sequencing',
    ],
  },
];

export const EDUCATION = 'Iqra University, Islamabad. Bachelor of Science, Computer Science, 2019 to 2023.';

export const PROJECT_IDS = PROJECTS.map(p => p.id);
export const projectById = id => PROJECTS.find(p => p.id === id);

/** Fallback order when the model gives nothing usable. */
export const DEFAULT_ORDER = {
  se: ['zatca', 'mmm', 'portal', 'pepsico', 'consultant', 'qa'],
  ai: ['portal', 'pepsico', 'recruiting_automation', 'zatca', 'consultant', 'mmm'],
  data: ['pepsico', 'ztbl', 'mmm', 'zatca', 'recruiting_automation', 'portal'],
};
