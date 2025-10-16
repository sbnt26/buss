import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Test clients API is working!',
    clients: [
      { id: 1, name: 'Test Client 1' },
      { id: 2, name: 'Test Client 2' }
    ]
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json({
      message: 'Test client created successfully!',
      data: body,
      id: Math.floor(Math.random() * 1000)
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON', message: (error as Error).message },
      { status: 400 }
    );
  }
}


