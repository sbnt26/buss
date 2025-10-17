import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * Health check endpoint for monitoring
 * Returns 200 if app and database are healthy
 */
export async function GET() {
  try {
    // Basic health check - only check if database is configured
    const dbConfigured = !!process.env.DATABASE_URL;
    
    // Try database connection if configured
    let dbStatus = 'not_configured';
    if (dbConfigured) {
      try {
        const pool = getPool();
        await pool.query('SELECT 1');
        dbStatus = 'ok';
      } catch (error) {
        dbStatus = 'error';
        console.error('Database connection failed:', error);
      }
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
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
      },
      { status: 503 }
    );
  }
}



