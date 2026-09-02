// Standard application form fields, copied into ATS forms with one click on /admin/jobs.
// Every value is true today. Notice period stays a placeholder until Anas states it.
export const RESUME_FILES = {
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
  ['Headline', 'AI Automation Engineer | Python, n8n, LLM Workflows, API Integrations, Data Pipelines'],
  ['Short bio (3 lines)', 'AI Consultant at Convergent Business Technologies since 2024, building automation and AI systems that remove manual work from finance, compliance and recruiting workflows with Python, SQL, n8n and LLMs. Shipped a production recruitment portal on Next.js and Supabase, and an LLM assisted SKU mapping pipeline that cut mapping time from 80 minutes to 40 seconds per 100 SKUs. Automated workflows have reduced processing time by 60 to 75 percent.'],
];

// The only allowed source of facts for cover notes and DMs. Mirrors Jobs/resume/resume_source.md
// in the main workspace. If the resume changes there, change it here in the same commit.
export const RESUME_TEXT = `Muhammad Anas
AI Automation Engineer | Python, n8n, LLM Workflows, API Integrations, Data Pipelines
muhammadanasq@gmail.com | +92 302 9222402 | linkedin.com/in/anasqureshiai | anas-qureshi-ai-consultant.vercel.app
Based in Islamabad, Pakistan (UTC+5).

Summary
AI Consultant at Convergent Business Technologies since 2024, building automation and AI systems that remove manual work from finance, compliance and recruiting workflows using Python, SQL, n8n and LLMs. Shipped a production recruitment portal on Next.js and Supabase, and an LLM assisted SKU mapping pipeline that cut mapping time from 80 minutes to 40 seconds per 100 SKUs. Automated workflows have reduced processing time by 60 to 75 percent.

Skills
Programming: Python, SQL, FastAPI, TypeScript, Next.js
AI and Automation: LLM workflow automation, generative AI and LLMs, n8n, AI agents, API integration, ZATCA e invoicing integration
Data and BI: ETL data pipelines, relational SQL database design, Tableau, Power BI, Microsoft Excel
Tools: Docker, Notion, Gemini, Supabase, Vercel, Antigravity, Odoo, Microsoft Dynamics 365, Zoho, QuickBooks

Experience
Convergent Business Technologies, Pakistan, AI Consultant, 2024 to present
- Developed automated ETL pipelines using Python, SQL and Excel
- Implemented AI assisted workflow automation using LLMs and n8n
- Automated manual workflows, reducing processing time by 60 to 75 percent
- Designed centralized SQL databases to remove version conflicts
- Built dashboards and reports using Tableau and Power BI
- Collaborated with business, audit and IT teams to ensure system traceability

Projects
CBT Recruitment Workflow Automation, 2024. Python, Notion, n8n, LLMs. Consolidated multiple recruitment workflows into a single Notion based platform. Automated candidate assessment steps using workflow automation and LLMs, reducing coordination time by 60 percent. Piloted AI agents for repetitive tasks, reducing average response time by 2 days. Built a recruiter training module that improved shortlisting consistency by 35 percent.
PepsiCo Retail Analytics, 2024. Python, Tableau, Gemini, Docker, Excel. Automated SKU mapping using Python and AI assisted logic, reducing mapping time from 80 minutes to 40 seconds per 100 SKUs. Increased mapping accuracy from 70 percent to 95 percent using a combination of rules and LLM fine tuning. Designed Tableau dashboards tracking sales, pricing and availability across 13 retailers. Reduced data validation turnaround from 3 days to 1 day and reporting delays by 66 percent. Containerized workflows with Docker.
ZATCA Phase 2 E Invoicing Integration, Banking and Compliance, 2026. Python, SQL, ZATCA API, Odoo, Microsoft Dynamics 365, Zoho, QuickBooks. Integrated a core banking system with ZATCA Phase 2 e invoicing for automated, regulation compliant invoice clearance with the tax authority. Built ZATCA compliant e invoicing for Odoo and Microsoft Dynamics 365. Automated invoice generation, validation and submission end to end.
CBT Recruitment Portal, Full Stack Development, 2025. Next.js, TypeScript, Tailwind CSS, Supabase, Vercel, Antigravity. Built a production recruitment web application with a role based admin portal, dashboards, candidate tracking, assessment slot scheduling, role based access control, authentication and resume uploads. Deployed on Vercel.
ZTBL Credit Risk Model Automation, 2025. Python, SQL, Docker, Excel. Automated 20+ Excel based PD, LGD, EAD and ECL models using Python and SQL, reducing manual effort by about 75 percent. Designed and deployed a relational SQL database to centralize inputs, eliminating version conflicts.
Independent AI Consultant, 2026. Built and runs a live AI assistant demo with an admin pipeline at anas-qureshi-ai-consultant.vercel.app (Next.js, Supabase, Vercel). Also built his own end to end lead generation and cold outreach engine: Google Maps and public page scraping in Python, email extraction and validation with bounce handling, LLM personalization, automated sequencing, on Node.js, Python and Supabase.
Data Analytics Training, 2024. CS50, SQL, Agile, Cloud Foundations, Applied Statistics, Tableau and Power BI. Adventure Works DB and IBM Red Book case studies.

Education
Iqra University, Islamabad. Bachelor of Science, Computer Science, 2019 to 2023.

Not on the resume, do not claim: Azure, AWS, GCP certifications, Copilot Studio, Kubernetes, Spark, Kafka, on premise LLM hosting, PyTorch, TensorFlow, scikit learn, more than 2 years of professional experience, any named CBT client.`;
