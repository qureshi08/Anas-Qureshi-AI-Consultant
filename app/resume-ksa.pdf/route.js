import { buildResumePdf } from '../../lib/jobs/resumePdf';

export const dynamic = 'force-dynamic';

// Saudi roles resume (2026-11-16): brother's Saudi number, moving to Madinah, transferable visa line. Same content as /resume.pdf otherwise. Built from lib/jobs/resumeData.js on
// every request, so it always matches the current resume; banking and AI proofs lead.
export async function GET() {
  const bytes = await buildResumePdf({
    title: 'AI Implementation Engineer',
    resume_variant: 'se', saudi: true,
    resume_plan: { project_order: ['ztbl', 'pepsico', 'eclagent', 'portal', 'zatca', 'mmm'] },
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Anas_Qureshi_AI_Implementation_Engineer_KSA.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
