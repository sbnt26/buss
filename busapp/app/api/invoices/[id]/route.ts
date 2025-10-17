import { NextResponse } from 'next/server';
import { getSessionFromRequest, requireOrganization } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const invoiceId = parseInt(params.id);

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Get invoice with client info
    const result = await query(
      `SELECT 
        i.*,
        c.name as client_name,
        c.email as client_email,
        c.ico as client_ic,
        c.dic as client_dic,
        c.address_street as client_street,
        c.address_city as client_city,
        c.address_zip as client_postal_code
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = result.rows[0];

    // Check authorization
    requireOrganization(session, invoice.organization_id);

    // Get invoice items
    const itemsResult = await query(
      `SELECT 
        description,
        quantity,
        unit,
        unit_price,
        vat_rate,
        subtotal,
        vat_amount,
        total
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY position`,
      [invoiceId]
    );

    return NextResponse.json({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      variable_symbol: invoice.variable_symbol,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      delivery_date: invoice.delivery_date,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      vat: invoice.vat_amount,
      total_with_vat: invoice.total,
      note: invoice.notes,
      vat_applicable:
        invoice.vat_amount !== null
          ? Number(invoice.vat_amount) > 0
          : false,
      created_at: invoice.created_at,
      sent_at: invoice.sent_at,
      paid_at: invoice.paid_at,
      client_id: invoice.client_id,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      client_ic: invoice.client_ic,
      client_dic: invoice.client_dic,
      client_street: invoice.client_street,
      client_city: invoice.client_city,
      client_postal_code: invoice.client_postal_code,
      items: itemsResult.rows.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('Get invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceId = parseInt(params.id, 10);
    if (Number.isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const body = await request.json();
    const newStatus = body?.status;

    const allowedStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (typeof newStatus !== 'string' || !allowedStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const invoiceResult = await query(
      `SELECT 
        i.organization_id,
        i.client_id,
        c.name as client_name,
        c.email as client_email,
        c.ico as client_ic,
        c.dic as client_dic,
        c.address_street as client_street,
        c.address_city as client_city,
        c.address_zip as client_postal_code
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0];
    requireOrganization(session, invoice.organization_id);

    const updateResult = await query(
      `UPDATE invoices
         SET status = $1::text,
             sent_at = CASE 
               WHEN $1::text = 'sent' THEN NOW()
               WHEN sent_at IS NOT NULL AND $1::text NOT IN ('sent', 'paid') THEN NULL
               ELSE sent_at
             END,
             paid_at = CASE
               WHEN $1::text = 'paid' THEN NOW()
               WHEN paid_at IS NOT NULL AND $1::text <> 'paid' THEN NULL
               ELSE paid_at
             END,
             updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, invoiceId]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const refreshed = await query(
      `SELECT 
        i.*,
        c.name as client_name,
        c.email as client_email,
        c.ico as client_ic,
        c.dic as client_dic,
        c.address_street as client_street,
        c.address_city as client_city,
        c.address_zip as client_postal_code
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (refreshed.rowCount === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const refreshedInvoice = refreshed.rows[0];

    const itemsResult = await query(
      `SELECT 
        description,
        quantity,
        unit,
        unit_price,
        vat_rate,
        subtotal,
        vat_amount,
        total
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY position`,
      [invoiceId]
    );

    return NextResponse.json({
      id: refreshedInvoice.id,
      invoice_number: refreshedInvoice.invoice_number,
      variable_symbol: refreshedInvoice.variable_symbol,
      status: refreshedInvoice.status,
      issue_date: refreshedInvoice.issue_date,
      due_date: refreshedInvoice.due_date,
      delivery_date: refreshedInvoice.delivery_date,
      currency: refreshedInvoice.currency,
      subtotal: refreshedInvoice.subtotal,
      vat: refreshedInvoice.vat_amount,
      total_with_vat: refreshedInvoice.total,
      note: refreshedInvoice.notes,
      vat_applicable:
        refreshedInvoice.vat_amount !== null ? Number(refreshedInvoice.vat_amount) > 0 : false,
      created_at: refreshedInvoice.created_at,
      sent_at: refreshedInvoice.sent_at,
      paid_at: refreshedInvoice.paid_at,
      client_id: refreshedInvoice.client_id,
      client_name: refreshedInvoice.client_name,
      client_email: refreshedInvoice.client_email,
      client_ic: refreshedInvoice.client_ic,
      client_dic: refreshedInvoice.client_dic,
      client_street: refreshedInvoice.client_street,
      client_city: refreshedInvoice.client_city,
      client_postal_code: refreshedInvoice.client_postal_code,
      items: itemsResult.rows.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Update invoice error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Failed to update invoice: ${error.message}`
            : 'Failed to update invoice',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceId = parseInt(params.id, 10);
    if (Number.isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const invoiceResult = await query(
      'SELECT organization_id FROM invoices WHERE id = $1',
      [invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0];
    requireOrganization(session, invoice.organization_id);

    await query('DELETE FROM invoices WHERE id = $1', [invoiceId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
