import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Debug API is working!',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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


