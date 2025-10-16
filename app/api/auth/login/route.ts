import { NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/schemas/auth';
import { verifyPassword } from '@/lib/password';
import { generateToken, createSessionCookie } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user by email
    const result = await query(
      `SELECT id, email, password_hash, full_name, role, organization_id, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Check if onboarding is completed
    const orgResult = await query(
      'SELECT address_street, address_city FROM organizations WHERE id = $1',
      [user.organization_id]
    );

    const needsOnboarding = !orgResult.rows[0]?.address_street || !orgResult.rows[0]?.address_city;

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      email: user.email,
    });

    // Create response with session cookie
    const response = NextResponse.json({
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      token,
      expiresIn: '7d',
      needsOnboarding,
    });

    // Set cookie in response
    const cookie = createSessionCookie(token);
    response.headers.set('Set-Cookie', cookie);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
