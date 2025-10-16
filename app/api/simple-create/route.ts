import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { CreateInvoiceSchema } from '@/lib/schemas/invoice';
import {
  calculateInvoiceTotals,
  type InvoiceItem,
} from '@/lib/invoice-calculations';
import {
  formatInvoiceNumber,
  generateVariableSymbol,
  getNextInvoiceNumber,
} from '@/lib/invoice-numbering';

interface RawInvoiceItem {
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  unit_price?: unknown;
  vatRate?: unknown;
  unit?: unknown;
}

interface RawBody {
  clientId?: unknown;
  issueDate?: unknown;
  dueDate?: unknown;
  deliveryDate?: unknown;
  notes?: unknown;
  vatApplicable?: unknown;
  items?: unknown;
}

export async function POST(request: Request) {
  try {
    const session = requireAuth(request);
    const rawBody: RawBody = await request.json();

    const vatApplicable =
      typeof rawBody.vatApplicable === 'boolean' ? rawBody.vatApplicable : true;

    const rawItems = Array.isArray(rawBody.items) ? rawBody.items : [];
    const normalizedItems: InvoiceItem[] = rawItems
      .map((item) => {
        const rawItem = item as RawInvoiceItem;

        const quantity =
          typeof rawItem.quantity === 'number'
            ? rawItem.quantity
            : Number(rawItem.quantity ?? NaN);

        const unitPriceCandidate =
          typeof rawItem.unitPrice === 'number'
            ? rawItem.unitPrice
            : typeof rawItem.unit_price === 'number'
            ? rawItem.unit_price
            : Number(rawItem.unitPrice ?? rawItem.unit_price ?? NaN);

        const baseVat =
          typeof rawItem.vatRate === 'number'
            ? rawItem.vatRate
            : Number(rawItem.vatRate ?? NaN);

        return {
          description: String(rawItem.description ?? '').trim(),
          quantity,
          unitPrice: unitPriceCandidate,
          vatRate: vatApplicable ? (Number.isFinite(baseVat) ? baseVat : 0) : 0,
          unit:
            typeof rawItem.unit === 'string' && rawItem.unit.trim()
              ? rawItem.unit.trim()
              : 'ks',
        };
      })
      .filter(
        (item) =>
          item.description.length > 0 &&
          Number.isFinite(item.quantity) &&
          Number.isFinite(item.unitPrice)
      );

    const normalizedPayload = {
      clientId:
        typeof rawBody.clientId === 'number'
          ? rawBody.clientId
          : Number(rawBody.clientId),
      issueDate:
        typeof rawBody.issueDate === 'string'
          ? rawBody.issueDate
          : rawBody.issueDate instanceof Date
          ? rawBody.issueDate.toISOString().slice(0, 10)
          : '',
      dueDate:
        typeof rawBody.dueDate === 'string'
          ? rawBody.dueDate
          : rawBody.dueDate instanceof Date
          ? rawBody.dueDate.toISOString().slice(0, 10)
          : '',
      deliveryDate:
        rawBody.deliveryDate === undefined || rawBody.deliveryDate === null
          ? undefined
          : typeof rawBody.deliveryDate === 'string'
          ? rawBody.deliveryDate
          : rawBody.deliveryDate instanceof Date
          ? rawBody.deliveryDate.toISOString().slice(0, 10)
          : String(rawBody.deliveryDate),
      notes:
        rawBody.notes === undefined || rawBody.notes === null
          ? undefined
          : String(rawBody.notes),
      items: normalizedItems,
    };

    const validation = CreateInvoiceSchema.safeParse(normalizedPayload);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const result = await transaction(async (client) => {
      const orgRes = await client.query(
        'SELECT * FROM organizations WHERE id = $1 LIMIT 1',
        [session.organizationId]
      );

      if (orgRes.rowCount === 0) {
        throw new Error('Organization not found');
      }

      const organization = orgRes.rows[0];

      const clientRes = await client.query(
        'SELECT * FROM clients WHERE id = $1 AND organization_id = $2',
        [data.clientId, session.organizationId]
      );

      if (clientRes.rowCount === 0) {
        throw new Error('Client not found');
      }

      const organizationIsVatPayer = Boolean(organization.is_vat_payer) || Boolean(organization.dic);

      const totals = calculateInvoiceTotals(
        data.items,
        organizationIsVatPayer
      );

      const issueYear = new Date(data.issueDate).getFullYear();
      const sequence = await getNextInvoiceNumber(
        session.organizationId,
        issueYear,
        client
      );
      const invoiceNumber = formatInvoiceNumber(
        organization.invoice_prefix ?? '',
        issueYear,
        sequence
      );
      const variableSymbol = generateVariableSymbol(invoiceNumber);

      const invoiceInsert = await client.query(
        `INSERT INTO invoices (
          organization_id,
          client_id,
          invoice_number,
          variable_symbol,
          status,
          issue_date,
          due_date,
          delivery_date,
          currency,
          subtotal,
          vat_amount,
          total,
          notes,
          created_by,
          created_via,
          pdf_path
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'web', NULL
        ) RETURNING id`,
        [
          session.organizationId,
          data.clientId,
          invoiceNumber,
          variableSymbol,
          'draft',
          data.issueDate,
          data.dueDate,
          data.deliveryDate ?? null,
          organization.default_currency ?? 'CZK',
          totals.subtotal,
          totals.vatAmount,
          totals.total,
          data.notes ?? null,
          session.userId,
        ]
      );

      const invoiceId = invoiceInsert.rows[0].id as number;

      for (let index = 0; index < totals.items.length; index += 1) {
        const item = totals.items[index];
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id,
            position,
            description,
            quantity,
            unit,
            unit_price,
            vat_rate,
            subtotal,
            vat_amount,
            total
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          )`,
          [
            invoiceId,
            index + 1,
            item.description,
            item.quantity,
            item.unit ?? 'ks',
            item.unitPrice,
            item.vatRate,
            item.subtotal,
            item.vatAmount,
            item.total,
          ]
        );
      }

      return {
        id: invoiceId,
        invoiceNumber,
        variableSymbol,
        total: totals.total,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (error.message === 'Client not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (error.message === 'Organization not found') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    console.error('Simple create invoice error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

