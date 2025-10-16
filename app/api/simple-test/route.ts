import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Simple test endpoint works!',
    timestamp: new Date().toISOString()
  }, { status: 201 });
}


