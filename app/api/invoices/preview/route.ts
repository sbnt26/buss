import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { InvoiceItemSchema } from '@/lib/schemas/invoice';
import { calculateInvoiceTotals } from '@/lib/invoice-calculations';
import { z } from 'zod';

const PreviewSchema = z.object({
  items: z.array(InvoiceItemSchema).min(1),
  isVatPayer: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = PreviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { items, isVatPayer } = validation.data;

    // Calculate totals
    const totals = calculateInvoiceTotals(items, isVatPayer);

    return NextResponse.json(totals);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Invoice preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

