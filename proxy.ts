import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy-session';

/**
 * Next.js 16 proxy (formerly `middleware`). Runs before cached routes on every
 * matched request. Responsibilities:
 *   1. Refresh the Supabase auth session (writes refreshed cookies).
 *   2. Gate the authenticated app shell — unauthenticated users hitting a
 *      protected route are redirected to /login.
 *
 * Public routes (marketing, login, public show pages, public profiles, auth
 * callback, API) are intentionally NOT gated here.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/library',
  '/search',
  '/upcoming',
  '/insights',
  '/profile',
  '/onboarding',
  '/admin',
];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets. The service
  // worker and PWA files are excluded so they are served untouched.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
