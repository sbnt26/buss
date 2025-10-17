import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json({
      message: "Client created successfully!",
      data: body,
      id: Math.floor(Math.random() * 1000)
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON", message: (error as Error).message },
      { status: 400 }
    );
  }
}
