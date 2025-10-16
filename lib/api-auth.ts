import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionData } from './auth';

export type AuthenticatedRequest = NextRequest & { auth: SessionData };

/**
 * Middleware to add authentication to API routes
 */
export function withAuth<T extends any[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const session = getSessionFromRequest(req);

      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Add session to request
      (req as any).auth = session;

      return await handler(req as AuthenticatedRequest, ...args);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

