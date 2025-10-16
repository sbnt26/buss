import { NextResponse } from 'next/server';
import { SignupSchema } from '@/lib/schemas/auth';
import { hashPassword } from '@/lib/password';
import { generateToken, createSessionCookie } from '@/lib/auth';
import { transaction } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = SignupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password, fullName, companyName, ico } = validation.data;

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create organization and user in transaction
    const result = await transaction(async (client) => {
      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
      }

      // Create organization
      const orgResult = await client.query(
        `INSERT INTO organizations (name, ico, address_street, address_city, address_zip)
         VALUES ($1, $2, '', '', '')
         RETURNING id`,
        [companyName, ico]
      );

      const organizationId = orgResult.rows[0].id;

      // Create admin user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, organization_id)
         VALUES ($1, $2, $3, 'admin', $4)
         RETURNING id, email, full_name, role, organization_id`,
        [email, passwordHash, fullName, organizationId]
      );

      return userResult.rows[0];
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.id,
      organizationId: result.organization_id,
      role: result.role,
      email: result.email,
    });

    // Create response with session cookie
    const response = NextResponse.json(
      {
        userId: result.id,
        organizationId: result.organization_id,
        token,
        message: 'Account created successfully',
      },
      { status: 201 }
    );

    response.headers.set('Set-Cookie', createSessionCookie(token));

    return response;
  } catch (error) {
    console.error('Signup error:', error);

    if (error instanceof Error && error.message === 'Email already registered') {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


