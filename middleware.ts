import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequestEdge } from './lib/auth-edge';

// Protected routes that require authentication
const protectedRoutes = ['/app'];

// Public routes that should redirect to /app if already authenticated
const publicRoutes = ['/login', '/signup'];

// Routes that require authentication but not onboarding
const onboardingRoutes = ['/onboarding'];

// Temporarily disabled middleware for debugging
export async function middleware(request: NextRequest) {
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
