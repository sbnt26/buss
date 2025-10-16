import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT id, name, email, phone, ico, dic, address_street, address_city, address_zip, address_country, notes, created_at, updated_at
      FROM clients
      ORDER BY name ASC
    `);

    return NextResponse.json({
      clients: result.rows,
    });
  } catch (error) {
    console.error('Error listing clients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await query(
      `INSERT INTO clients (
        organization_id, name, email, phone, ico, dic,
        address_street, address_city, address_zip, address_country, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name, email, phone, ico, dic, address_street, address_city, address_zip, address_country, notes, created_at, updated_at`,
      [
        1, // TODO: Get from auth
        body.name,
        body.email || null,
        body.phone || null,
        body.ic || null,
        body.dic || null,
        body.street || null,
        body.city || null,
        body.postal_code || null,
        body.country,
        body.note || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}