/**
 * Anas's resume as structured data. The per job tailored resume is rendered FROM THIS FILE:
 * the model may only reorder blocks, choose which to include, and write the summary. It can
 * never write a bullet, so a tailored resume cannot contain an invented fact.
 * Source of truth: Jobs/resume/resume_source.md in the main workspace.
 */
export const CONTACT = {
  name: 'Muhammad Anas',
  email: 'muhammadanasq@gmail.com',
  phone: '+92 302 9222402',
  linkedin: 'linkedin.com/in/anasqureshiai',
  site: 'anas-qureshi-ai-consultant.vercel.app',
  location: 'Islamabad, Pakistan',
};

export const HEADLINES = {
  ai: 'AI Automation Engineer | Python, n8n, LLM Workflows, API Integrations, Data Pipelines',
  data: 'Data and Analytics Engineer | Python, SQL, ETL Pipelines, Tableau, Power BI',
};

// Every skill Anas can truthfully claim. The model picks which to lead with, nothing else.
export const SKILLS = {
  Programming: ['Python', 'SQL', 'FastAPI', 'TypeScript', 'Next.js'],
  'AI and Automation': ['LLM workflow automation', 'generative AI and LLMs', 'n8n', 'AI agents', 'RAG and prompt pipelines', 'API integration', 'ZATCA e invoicing integration'],
  'Data and BI': ['ETL data pipelines', 'relational SQL database design', 'Tableau', 'Power BI', 'Microsoft Excel'],
  Tools: ['Docker', 'Git', 'Supabase', 'Vercel', 'Notion', 'Gemini', 'Odoo', 'Microsoft Dynamics 365', 'Zoho', 'QuickBooks'],
};

export const EXPERIENCE = {
  company: 'Convergent Business Technologies, Pakistan',
  title: 'AI Consultant',
  dates: '2024 to present',
  bullets: [
    'Implemented AI assisted workflow automation using LLMs and n8n',
    'Automated manual workflows, reducing processing time by 60 to 75 percent',
    'Developed automated ETL pipelines using Python, SQL and Excel',
    'Designed centralized SQL databases to remove version conflicts',
    'Built dashboards and reports using Tableau and Power BI',
    'Collaborated with business, audit and IT teams to ensure system traceability',
  ],
};

export const PROJECTS = [
  {
    id: 'recruiting_automation', name: 'CBT Recruitment Workflow Automation', year: '2024',
    stack: 'Python, Notion, n8n, LLMs',
    tags: 'automation n8n llm agents workflow recruiting notion',
    bullets: [
      'Consolidated multiple recruitment workflows into a single Notion based platform',
      'Automated candidate assessment steps using workflow automation and LLMs, reducing coordination time by 60 percent',
      'Piloted AI agents for repetitive tasks, reducing average response time by 2 days',
      'Built a recruiter training module that improved shortlisting consistency by 35 percent',
    ],
  },
  {
    id: 'pepsico', name: 'PepsiCo Retail Analytics', year: '2024',
    stack: 'Python, Tableau, Gemini, Docker, Excel',
    tags: 'llm fine tuning data analytics tableau dashboards docker accuracy pipeline retail',
    bullets: [
      'Automated SKU mapping using Python and AI assisted logic, reducing mapping time from 80 minutes to 40 seconds per 100 SKUs',
      'Increased mapping accuracy from 70 percent to 95 percent using a combination of rules and LLM fine tuning',
      'Designed Tableau dashboards tracking sales, pricing and availability across 13 retailers',
      'Reduced data validation turnaround from 3 days to 1 day and reporting delays by 66 percent',
      'Containerized workflows with Docker for smoother onboarding of analysts',
    ],
  },
  {
    id: 'zatca', name: 'ZATCA Phase 2 E Invoicing Integration, Banking and Compliance', year: '2026',
    stack: 'Python, SQL, ZATCA API, Odoo, Microsoft Dynamics 365, Zoho, QuickBooks',
    tags: 'api integration compliance banking erp odoo dynamics fintech invoicing',
    bullets: [
      'Integrated a core banking system with ZATCA Phase 2 e invoicing for automated, regulation compliant invoice clearance with the tax authority',
      'Built ZATCA compliant e invoicing for Odoo and Microsoft Dynamics 365',
      'Automated invoice generation, validation and submission end to end, removing manual compliance overhead',
    ],
  },
  {
    id: 'portal', name: 'CBT Recruitment Portal, Full Stack Development', year: '2025',
    stack: 'Next.js, TypeScript, Tailwind CSS, Supabase, Vercel',
    tags: 'fullstack nextjs typescript supabase web app rbac auth product',
    bullets: [
      'Built a production recruitment web application with a role based admin portal, dashboards, candidate tracking and assessment slot scheduling',
      'Implemented role based access control, authentication and resume file uploads',
      'Deployed on Vercel as a production system managing applications, assessments and admin workflows',
    ],
  },
  {
    id: 'ztbl', name: 'ZTBL Credit Risk Model Automation', year: '2025',
    stack: 'Python, SQL, Docker, Excel',
    tags: 'python sql modelling finance risk excel automation database',
    bullets: [
      'Automated 20+ Excel based PD, LGD, EAD and ECL models using Python and SQL, reducing manual effort by about 75 percent',
      'Designed and deployed a relational SQL database to centralize inputs, eliminating version conflicts',
    ],
  },
  {
    id: 'consultant', name: 'Independent AI Consultant', year: '2026',
    stack: 'Next.js, Supabase, Vercel, Python, Node.js',
    tags: 'llm assistant agent scraping outreach automation product saas',
    bullets: [
      'Built and runs a live AI assistant with an admin pipeline at anas-qureshi-ai-consultant.vercel.app',
      'Built an end to end lead generation and cold outreach engine: public page scraping in Python, email extraction and validation with bounce handling, LLM personalization and automated sequencing',
    ],
  },
  {
    id: 'training', name: 'Data Analytics Training, Hands On Projects', year: '2024',
    stack: 'Python, SQL, Tableau, Power BI, Excel',
    tags: 'training sql tableau power bi statistics',
    bullets: [
      'Completed training in CS50, SQL, Agile, Cloud Foundations, Applied Statistics, Tableau and Power BI',
      'Built dashboards and applied statistical learning to real world dataset profiling and reporting',
    ],
  },
];

export const EDUCATION = 'Iqra University, Islamabad. Bachelor of Science, Computer Science, 2019 to 2023.';

export const PROJECT_IDS = PROJECTS.map(p => p.id);
export const projectById = id => PROJECTS.find(p => p.id === id);

/** Fallback order when the model gives nothing usable. */
export const DEFAULT_ORDER = {
  ai: ['recruiting_automation', 'pepsico', 'consultant', 'zatca', 'portal', 'ztbl'],
  data: ['pepsico', 'ztbl', 'zatca', 'recruiting_automation', 'consultant', 'portal'],
};
