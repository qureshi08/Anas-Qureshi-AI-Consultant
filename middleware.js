import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isAllowedAdmin } from './lib/auth';

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Signed in with Google, but not on the allowlist. Sign-in alone is not
  // authorisation: anyone can complete a Google flow.
  if (pathname.startsWith('/admin') && user && !isAllowedAdmin(user)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('denied', '1');
    return NextResponse.redirect(url);
  }

  // Not signed in at all
  if (pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Already signed in and allowed, skip the login page
  if (pathname === '/login' && isAllowedAdmin(user)) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
