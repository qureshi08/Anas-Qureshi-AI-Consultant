import { redirect } from 'next/navigation';

// Since 2026-10-27 the admin opens on the North Star page (the goal, tracks and time blocks),
// so the goal is the first thing Anas sees. The job board stays one click away.
// The old small-business funnel dashboard lives at /admin/overview, listed under Archive.
export default function AdminHome() {
  redirect('/admin/north-star');
}
