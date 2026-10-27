import { getAdminUser } from '../../../lib/requireAdmin';
import { NORTH_STAR_HTML } from '../../../lib/northStarHtml';

export const dynamic = 'force-dynamic';

// Served as a whole page, outside the admin layout, so it keeps its own brand styling.
// The middleware already sends signed out visitors to /login; this check stays as a second gate
// because the page holds Anas's salary and goal.
export async function GET() {
  if (!(await getAdminUser())) return new Response('Unauthorized', { status: 401 });
  return new Response(NORTH_STAR_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
