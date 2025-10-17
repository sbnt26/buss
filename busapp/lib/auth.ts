import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from './config';

// Types
export interface JWTPayload {
  userId: number;
  organizationId: number;
  role: 'admin' | 'staff';
  email: string;
}

export interface SessionData extends JWTPayload {
  iat: number;
  exp: number;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.auth.sessionSecret as Secret, {
    expiresIn: config.auth.jwtExpiresIn as string,
  } as SignOptions);
}

/**
 * Verify and decode JWT token
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): SessionData {
  try {
    const decoded = jwt.verify(token, config.auth.sessionSecret) as SessionData;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Extract token from cookie
 */
export function extractTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies['auth-token'] || null;
}

/**
 * Get session from request (checks both header and cookie)
 */
export function getSessionFromRequest(req: Request): SessionData | null {
  const authHeader = req.headers.get('authorization');
  const cookieHeader = req.headers.get('cookie');

  const token = extractTokenFromHeader(authHeader) || extractTokenFromCookie(cookieHeader);

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export function requireAuth(req: Request): SessionData {
  const session = getSessionFromRequest(req);

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Require specific role
 */
export function requireRole(session: SessionData, allowedRoles: ('admin' | 'staff')[]): void {
  if (!allowedRoles.includes(session.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }
}

/**
 * Check if user belongs to organization
 */
export function requireOrganization(session: SessionData, organizationId: number): void {
  if (session.organizationId !== organizationId) {
    throw new Error('Forbidden: Access to different organization denied');
  }
}

/**
 * Create session cookie header
 */
export function createSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  const parts = [
    `auth-token=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`
  ];
  
  if (config.isProduction) {
    parts.push('Secure');
  }
  
  return parts.join('; ');
}

/**
 * Create session clear cookie header
 */
export function clearSessionCookie(): string {
  return 'auth-token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}
