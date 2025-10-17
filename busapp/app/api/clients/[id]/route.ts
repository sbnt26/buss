import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { clientApiUpdateSchema, type ClientApiUpdateInput } from '@/lib/schemas/client';
import { withAuth } from '@/lib/api-auth';
import { ZodError } from 'zod';

/**
 * GET /api/clients/[id] - Get client detail
 */
export const GET = withAuth(async (
  req,
  { params }: { params: { id: string } }
) => {
  try {
    const organizationId = req.auth.organizationId;

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    const result = await query(
      `SELECT id, name, email, phone, ico, dic, address_street, address_city, address_zip, address_country, notes,
              created_at, updated_at
       FROM clients
       WHERE id = $1 AND organization_id = $2`,
      [clientId, organizationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/clients/[id] - Update client
 */
export const PATCH = withAuth(async (
  req,
  { params }: { params: { id: string } }
) => {
  try {
    const organizationId = req.auth.organizationId;

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    const body = await req.json();
    const sanitizedBody = Object.entries(body ?? {}).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          acc[key] = trimmed.length === 0 ? '' : trimmed;
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    const data = clientApiUpdateSchema.parse(sanitizedBody) as ClientApiUpdateInput;

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email ? data.email : null);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone ? data.phone : null);
    }
    if (data.dic !== undefined) {
      updates.push(`dic = $${paramIndex++}`);
      values.push(data.dic ? data.dic : null);
    }
    if (data.ico !== undefined) {
      updates.push(`ico = $${paramIndex++}`);
      values.push(data.ico ? data.ico : null);
    }
    if (data.address_street !== undefined) {
      updates.push(`address_street = $${paramIndex++}`);
      values.push(data.address_street ? data.address_street : null);
    }
    if (data.address_city !== undefined) {
      updates.push(`address_city = $${paramIndex++}`);
      values.push(data.address_city ? data.address_city : null);
    }
    if (data.address_zip !== undefined) {
      updates.push(`address_zip = $${paramIndex++}`);
      values.push(data.address_zip ? data.address_zip : null);
    }
    if (data.address_country !== undefined) {
      updates.push(`address_country = $${paramIndex++}`);
      values.push(data.address_country);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes ? data.notes : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(clientId, organizationId);

    const queryText = `
      UPDATE clients
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
      RETURNING id, name, email, phone, ico, dic, address_street, address_city, address_zip, address_country, notes, created_at, updated_at
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/clients/[id] - Delete client
 */
export const DELETE = withAuth(async (
  req,
  { params }: { params: { id: string } }
) => {
  try {
    const organizationId = req.auth.organizationId;

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    // Check if client has invoices
    const invoiceCheck = await query(
      'SELECT COUNT(*) FROM invoices WHERE client_id = $1',
      [clientId]
    );

    if (parseInt(invoiceCheck.rows[0].count, 10) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with existing invoices' },
        { status: 409 }
      );
    }

    const result = await query(
      'DELETE FROM clients WHERE id = $1 AND organization_id = $2 RETURNING id',
      [clientId, organizationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
