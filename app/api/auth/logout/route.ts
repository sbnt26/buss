import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

function buildLogoutResponse(request: Request): NextResponse {
  const accept = request.headers.get('accept') ?? '';

  // If the client expects JSON (fetch/XHR), keep JSON payload.
  if (accept.includes('application/json')) {
    const jsonResponse = NextResponse.json({ message: 'Logged out successfully' });
    jsonResponse.headers.set('Set-Cookie', clearSessionCookie());
    return jsonResponse;
  }

  // Otherwise redirect the browser back to the login page.
  const loginUrl = new URL('/login', request.url);
  const redirectResponse = NextResponse.redirect(loginUrl, { status: 303 });
  redirectResponse.headers.set('Set-Cookie', clearSessionCookie());
  return redirectResponse;
}

export async function POST(request: Request) {
  return buildLogoutResponse(request);
}

// Allow GET /api/auth/logout for link-based sign-out.
export async function GET(request: Request) {
  return buildLogoutResponse(request);
}


