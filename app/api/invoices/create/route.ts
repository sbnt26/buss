import { NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { CreateInvoiceSchema } from '@/lib/schemas/invoice';
import { getNextInvoiceNumber, formatInvoiceNumber, generateVariableSymbol } from '@/lib/invoice-numbering';
import { calculateInvoiceTotals } from '@/lib/invoice-calculations';
import { savePDF } from '@/lib/file-storage';
import { renderInvoiceHTML } from '@/lib/pdf-template';
import { renderHTMLToPDF } from '@/lib/pdf-generator';
import { requireAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = CreateInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const session = requireAuth(request);

    // Create invoice in transaction
    const result = await transaction(async (client) => {
      // 1. Get organization info (use first organization for now)
      const orgResult = await client.query(
        'SELECT * FROM organizations LIMIT 1'
      );

      if (orgResult.rows.length === 0) {
        throw new Error('Organization not found');
      }

      const organization = orgResult.rows[0];

      if (organization.id !== session.organizationId) {
        throw new Error('Forbidden: Organization mismatch');
      }

      // 2. Get client info
      const clientResult = await client.query(
        'SELECT * FROM clients WHERE id = $1',
        [data.clientId]
      );

      if (clientResult.rows.length === 0) {
        throw new Error('Client not found');
      }

      const clientData = clientResult.rows[0];

      // 3. Calculate totals
      const organizationIsVatPayer = Boolean(organization.is_vat_payer) || Boolean(organization.dic);

      const totals = calculateInvoiceTotals(data.items, organizationIsVatPayer);

      // 4. Get next invoice number (atomic)
      const issueDate = new Date(data.issueDate);
      const dueDate = new Date(data.dueDate);
      const deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;

      const year = issueDate.getFullYear();
      const sequence = await getNextInvoiceNumber(organization.id, year, client);
      const invoiceNumber = formatInvoiceNumber(organization.invoice_prefix, year, sequence);
      const variableSymbol = generateVariableSymbol(invoiceNumber);

      // 5. Create invoice record
      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          organization_id, client_id, invoice_number, variable_symbol, 
          status, issue_date, due_date, delivery_date, currency,
          subtotal, vat_amount, total, notes, created_by, created_via
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'web')
        RETURNING id`,
        [
          organization.id, // Use organization ID from database
          data.clientId,
          invoiceNumber,
          variableSymbol,
          'draft', // Initial status
          data.issueDate,
          data.dueDate,
          data.deliveryDate || null,
          organization.default_currency,
          totals.subtotal,
          totals.vatAmount,
          totals.total,
          data.notes || null,
          session.userId,
        ]
      );

      const invoiceId = invoiceResult.rows[0].id;

      // 6. Create invoice items
      for (let i = 0; i < totals.items.length; i++) {
        const item = totals.items[i];
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, position, description, quantity, unit,
            unit_price, vat_rate, subtotal, vat_amount, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            invoiceId,
            i + 1,
            item.description,
            item.quantity,
            item.unit,
            item.unitPrice,
            item.vatRate,
            item.subtotal,
            item.vatAmount,
            item.total,
          ]
        );
      }

      // 7. Generate PDF from professional HTML template
      const html = await renderInvoiceHTML(
        {
          invoiceNumber,
          variableSymbol,
          issueDate,
          dueDate,
          deliveryDate: deliveryDate ?? undefined,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          currency: organization.default_currency ?? 'CZK',
          notes: data.notes ?? undefined,
        },
        {
          name: organization.name,
          ico: organization.ico,
          dic: organization.dic ?? undefined,
          isVatPayer: organizationIsVatPayer,
          addressStreet: organization.address_street,
          addressCity: organization.address_city,
          addressZip: organization.address_zip,
          bankAccount: organization.bank_account ?? undefined,
          iban: organization.iban ?? undefined,
          bankName: organization.bank_name ?? undefined,
          logoPath: organization.logo_path ?? undefined,
        },
        {
          name: clientData.name,
          ico: clientData.ico ?? undefined,
          dic: clientData.dic ?? undefined,
          addressStreet: clientData.address_street ?? undefined,
          addressCity: clientData.address_city ?? undefined,
          addressZip: clientData.address_zip ?? undefined,
        },
        totals.items.map((item, idx) => ({
          position: idx + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'ks',
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          subtotal: item.subtotal,
          vatAmount: item.vatAmount,
          total: item.total,
        }))
      );

      const pdfBuffer = await renderHTMLToPDF(html);

      // 8. Save PDF to filesystem
      const pdfPath = await savePDF(pdfBuffer, session.organizationId, year, invoiceNumber);

      // 9. Update invoice with PDF path
      await client.query(
        'UPDATE invoices SET pdf_path = $1, updated_at = NOW() WHERE id = $2',
        [pdfPath, invoiceId]
      );

      // 10. Create audit log entry
      await client.query(
        `INSERT INTO audit_log (
          organization_id, user_id, entity_type, entity_id, action, changes
        ) VALUES ($1, $2, 'invoice', $3, 'created', $4)`,
        [
          session.organizationId,
          session.userId,
          invoiceId,
          JSON.stringify({
            invoiceNumber,
            total: totals.total,
            clientId: data.clientId,
          }),
        ]
      );

      return {
        invoiceId,
        invoiceNumber,
        variableSymbol,
        total: totals.total,
        pdfPath,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      console.error('Invoice creation error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create invoice' },
        { status: 500 }
      );
    }

    console.error('Invoice creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
