import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * Health check endpoint for monitoring
 * Returns 200 if app and database are healthy
 */
export async function GET() {
  try {
    // Check database connection
    const pool = getPool();
    await pool.query('SELECT 1');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        application: 'ok',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'error',
          application: 'ok',
        },
      },
      { status: 503 }
    );
  }
}



