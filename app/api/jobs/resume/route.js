/**
 * Downloads the tailored resume for one job as a real PDF file.
 * GET /api/jobs/resume?id=<job id>   (admin only)
 */
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getAdminUser } from '../../../../lib/requireAdmin';
import { buildResumePdf, resumeFileName } from '../../../../lib/jobs/resumePdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request) {
  if (!(await getAdminUser())) return new Response('Unauthorized', { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return new Response('id required', { status: 400 });

  const admin = createAdminClient();
  const { data: job } = await admin.from('job_leads').select('company, resume_variant, resume_plan').eq('id', id).single();
  if (!job) return new Response('Job not found', { status: 404 });

  const bytes = await buildResumePdf(job);
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resumeFileName(job)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
