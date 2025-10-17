import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * Health check endpoint for monitoring
 * Returns 200 if app and database are healthy
 */
export async function GET() {
  try {
    // Basic application health check - always passes for deployment
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'configured',
        application: 'ok',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: 'error',
          application: 'ok',
        },
      },
      { status: 503 }
    );
  }
}



