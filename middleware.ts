import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequestEdge } from './lib/auth-edge';

// Protected routes that require authentication
const protectedRoutes = ['/app'];

// Public routes that should redirect to /app if already authenticated
const publicRoutes = ['/login', '/signup'];

// Routes that require authentication but not onboarding
const onboardingRoutes = ['/onboarding'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session
  const session = await getSessionFromRequestEdge(request);

  // Protected routes - require authentication
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Public routes - redirect to /app if authenticated
  if (publicRoutes.includes(pathname)) {
    if (session) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }
  }

  // Onboarding routes - require authentication
  if (onboardingRoutes.some(route => pathname.startsWith(route))) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/app/:path*',
    '/login',
    '/signup',
    '/onboarding',
  ],
};
