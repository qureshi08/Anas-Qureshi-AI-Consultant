import { redirect } from 'next/navigation';

// Since 2026-09-25 the admin opens on the job board: remote job first, then founder pitches.
// The old small-business funnel dashboard lives at /admin/overview, listed under Archive.
export default function AdminHome() {
  redirect('/admin/jobs');
}
