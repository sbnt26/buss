import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT id,
              name,
              email,
              phone,
              ico,
              dic,
              address_street,
              address_city,
              address_zip,
              address_country,
              notes,
              created_at,
              updated_at
         FROM clients
        WHERE organization_id = $1
        ORDER BY name ASC`,
      [session.organizationId]
    );

    return NextResponse.json({ clients: result.rows });
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
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const result = await query(
      `INSERT INTO clients (
         organization_id,
         name,
         email,
         phone,
         ico,
         dic,
         address_street,
         address_city,
         address_zip,
         address_country,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id,
                 name,
                 email,
                 phone,
                 ico,
                 dic,
                 address_street,
                 address_city,
                 address_zip,
                 address_country,
                 notes,
                 created_at,
                 updated_at`,
      [
        session.organizationId,
        body.name,
        body.email || null,
        body.phone || null,
        body.ic || null,
        body.dic || null,
        body.street || null,
        body.city || null,
        body.postal_code || null,
        body.country || 'CZ',
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
