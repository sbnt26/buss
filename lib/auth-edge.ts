import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { config } from './config';
import type { SessionData } from './auth';

const encoder = new TextEncoder();

function getSecretKey(): Uint8Array {
  if (!config.auth.sessionSecret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return encoder.encode(config.auth.sessionSecret);
}

function extractToken(request: NextRequest): string | null {
  const headerToken = request.headers.get('authorization');
  if (headerToken) {
    const [scheme, token] = headerToken.split(' ');
    if (scheme === 'Bearer' && token) {
      return token;
    }
  }

  const cookieToken = request.cookies.get('auth-token')?.value;
  return cookieToken || null;
}

export async function getSessionFromRequestEdge(
  request: NextRequest
): Promise<SessionData | null> {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}
