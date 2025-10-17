import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    message: 'Debug API is working!',
    timestamp: new Date().toISOString()
  });
}

// Nový endpoint pro spuštění migrace
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'run-migration') {
      // Spustím migraci při prvním požadavku
      const migrationPath = join(process.cwd(), 'migrations', '003_fix_schema_columns.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd && !cmd.startsWith('--'));

      for (const command of commands) {
        if (command) {
          await query(command);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Migrace spuštěna úspěšně',
        commands: commands.length
      });
    }

    console.log('Debug POST called with body:', body);
    return NextResponse.json({
      message: 'Debug POST successful!',
      received: body
    }, { status: 201 });
  } catch (error) {
    console.error('Debug POST error:', error);
    return NextResponse.json({
      error: 'Debug POST failed',
      message: (error as Error).message
    }, { status: 400 });
  }
}


