import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/invoices/export - Export invoices to CSV
 * Query params:
 *  - status (optional): filter by status
 *  - from_date (optional): filter by issue_date >= from_date
 *  - to_date (optional): filter by issue_date <= to_date
 */
export async function GET(req: NextRequest) {
  try {
    const organizationId = (req as any).auth?.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    let queryText = `
      SELECT 
        i.invoice_number,
        c.name as client_name,
        c.ic as client_ic,
        i.issue_date,
        i.due_date,
        i.subtotal,
        i.vat,
        i.total_with_vat,
        i.status,
        i.vat_applicable,
        i.note
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.organization_id = $1
    `;
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }

    if (fromDate) {
      queryText += ` AND i.issue_date >= $${paramIndex++}`;
      params.push(fromDate);
    }

    if (toDate) {
      queryText += ` AND i.issue_date <= $${paramIndex++}`;
      params.push(toDate);
    }

    queryText += ' ORDER BY i.issue_date DESC';

    const result = await query(queryText, params);

    // Generate CSV
    const headers = [
      'Číslo faktury',
      'Klient',
      'IČO',
      'Datum vystavení',
      'Datum splatnosti',
      'Mezisoučet',
      'DPH',
      'Celkem s DPH',
      'Stav',
      'DPH účtováno',
      'Poznámka',
    ];

    const rows = result.rows.map((row) => [
      row.invoice_number,
      row.client_name,
      row.client_ic || '',
      new Date(row.issue_date).toLocaleDateString('cs-CZ'),
      new Date(row.due_date).toLocaleDateString('cs-CZ'),
      parseFloat(row.subtotal).toFixed(2),
      parseFloat(row.vat).toFixed(2),
      parseFloat(row.total_with_vat).toFixed(2),
      row.status,
      row.vat_applicable ? 'Ano' : 'Ne',
      row.note || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      ),
    ].join('\n');

    // Add UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="faktury-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



