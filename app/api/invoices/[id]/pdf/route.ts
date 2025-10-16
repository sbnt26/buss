import { NextResponse } from 'next/server';
import { getSessionFromRequest, requireOrganization } from '@/lib/auth';
import { query } from '@/lib/db';
import { fileExists, savePDF, streamPDF, deletePDF } from '@/lib/file-storage';
import { renderInvoiceHTML } from '@/lib/pdf-template';
import { renderHTMLToPDF } from '@/lib/pdf-generator';

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

    // Get invoice with organization and client details
    const result = await query(
      `SELECT 
        i.id,
        i.organization_id,
        i.client_id,
        i.invoice_number,
        i.variable_symbol,
        i.status,
        i.issue_date,
        i.due_date,
        i.delivery_date,
        i.currency,
        i.subtotal,
        i.vat_amount,
        i.total,
        i.notes,
        i.pdf_path,
        i.created_at,
        o.name as organization_name,
        o.ico as organization_ico,
        o.dic as organization_dic,
        o.is_vat_payer,
        o.address_street as organization_address_street,
        o.address_city as organization_address_city,
        o.address_zip as organization_address_zip,
        o.bank_account as organization_bank_account,
        o.iban as organization_iban,
        o.bank_name as organization_bank_name,
        c.name as client_name,
        c.email as client_email,
        c.ico as client_ic,
        c.dic as client_dic,
        c.address_street as client_street,
        c.address_city as client_city,
        c.address_zip as client_postal_code
       FROM invoices i
       JOIN organizations o ON i.organization_id = o.id
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

    // Check authorization (must belong to same organization)
    requireOrganization(session, invoice.organization_id);

    let pdfPath = invoice.pdf_path as string | null;

    // Always regenerate to ensure latest template, removing cached copy if present
    if (pdfPath) {
      try {
        const exists = await fileExists(pdfPath);
        if (exists) {
          await deletePDF(pdfPath);
        }
      } catch (err) {
        console.warn('Failed to delete cached invoice PDF:', err);
      }
      pdfPath = null;
    }

    if (!pdfPath) {
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

      const organizationIsVatPayer = Boolean(invoice.is_vat_payer) || Boolean(invoice.organization_dic);

      const html = await renderInvoiceHTML(
        {
          invoiceNumber: invoice.invoice_number,
          variableSymbol: invoice.variable_symbol,
          issueDate: new Date(invoice.issue_date),
          dueDate: new Date(invoice.due_date),
          deliveryDate: invoice.delivery_date ? new Date(invoice.delivery_date) : undefined,
          subtotal: Number(invoice.subtotal),
          vatAmount: Number(invoice.vat_amount),
          total: Number(invoice.total),
          currency: invoice.currency || 'CZK',
          notes: invoice.notes ?? undefined,
        },
        {
          name: invoice.organization_name,
          ico: invoice.organization_ico,
          dic: invoice.organization_dic ?? undefined,
          isVatPayer: organizationIsVatPayer,
          addressStreet: invoice.organization_address_street,
          addressCity: invoice.organization_address_city,
          addressZip: invoice.organization_address_zip,
          bankAccount: invoice.organization_bank_account ?? undefined,
          iban: invoice.organization_iban ?? undefined,
          bankName: invoice.organization_bank_name ?? undefined,
          logoPath: undefined,
        },
        {
          name: invoice.client_name,
          ico: invoice.client_ic ?? undefined,
          dic: invoice.client_dic ?? undefined,
          addressStreet: invoice.client_street ?? undefined,
          addressCity: invoice.client_city ?? undefined,
          addressZip: invoice.client_postal_code ?? undefined,
        },
        itemsResult.rows.map((item: any, idx: number) => ({
          position: idx + 1,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit || 'ks',
          unitPrice: Number(item.unit_price),
          vatRate: Number(item.vat_rate),
          subtotal: Number(item.subtotal),
          vatAmount: Number(item.vat_amount),
          total: Number(item.total),
        }))
      );

      const buffer = await renderHTMLToPDF(html);
      const year = new Date(invoice.issue_date).getFullYear();
      pdfPath = await savePDF(buffer, invoice.organization_id, year, invoice.invoice_number);

      await query(
        'UPDATE invoices SET pdf_path = $1, updated_at = NOW() WHERE id = $2',
        [pdfPath, invoiceId]
      );
    }

    if (!pdfPath) {
      return NextResponse.json(
        { error: 'PDF not available' },
        { status: 500 }
      );
    }

    // Stream PDF
    const stream = streamPDF(pdfPath);
    const filename = `${invoice.invoice_number.replace(/\//g, '-')}.pdf`;

    // Convert Node.js stream to Web Stream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
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

    console.error('PDF stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
