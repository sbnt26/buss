export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE clause
    const conditions: string[] = ['i.organization_id = $1'];
    const params: any[] = [session.organizationId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`i.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (clientId) {
      conditions.push(`i.client_id = $${paramIndex}`);
      params.push(parseInt(clientId));
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`i.issue_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`i.issue_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(i.invoice_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get invoices
    const result = await query(
      `SELECT 
        i.id,
        i.invoice_number,
        i.variable_symbol,
        i.status,
        i.issue_date,
        i.due_date,
        i.total,
        i.currency,
        i.created_at,
        i.sent_at,
        i.paid_at,
        c.id as client_id,
        c.name as client_name
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE ${whereClause}
       ORDER BY i.${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      invoices: result.rows.map((row) => ({
        id: row.id,
        invoice_number: row.invoice_number,
        variable_symbol: row.variable_symbol,
        status: row.status,
        issue_date: row.issue_date,
        due_date: row.due_date,
        total_with_vat: row.total,
        currency: row.currency,
        created_at: row.created_at,
        sent_at: row.sent_at,
        paid_at: row.paid_at,
        client_id: row.client_id,
        client_name: row.client_name,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('List invoices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
