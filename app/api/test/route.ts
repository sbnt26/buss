import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Test API is working!',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({
    message: 'Test POST is working!',
    id: Math.floor(Math.random() * 1000)
  }, { status: 201 });
}


