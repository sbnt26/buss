import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';
import { OnboardingSchema } from '@/lib/schemas/auth';

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await query(
      `SELECT 
        id,
        name,
        ico,
        dic,
        is_vat_payer as "isVatPayer",
        address_street as "addressStreet",
        address_city as "addressCity",
        address_zip as "addressZip",
        address_country as "addressCountry",
        bank_account as "bankAccount",
        iban,
        bank_name as "bankName",
        logo_path as "logoPath",
        default_currency as "defaultCurrency",
        default_vat_rate as "defaultVatRate",
        invoice_prefix as "invoicePrefix",
        invoice_numbering_start as "invoiceNumberingStart",
        whatsapp_phone_id as "whatsappPhoneId",
        whatsapp_business_account_id as "whatsappBusinessAccountId"
       FROM organizations WHERE id = $1`,
      [session.organizationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const org = result.rows[0];

    return NextResponse.json({
      id: org.id,
      name: org.name,
      ico: org.ico,
      dic: org.dic,
      isVatPayer: org.isVatPayer,
      addressStreet: org.addressStreet,
      addressCity: org.addressCity,
      addressZip: org.addressZip,
      addressCountry: org.addressCountry,
      bankAccount: org.bankAccount,
      iban: org.iban,
      bankName: org.bankName,
      defaultCurrency: org.defaultCurrency,
      defaultVatRate:
        org.defaultVatRate !== null && org.defaultVatRate !== undefined
          ? Number(org.defaultVatRate)
          : null,
      invoicePrefix: org.invoicePrefix,
      invoiceNumberingStart:
        org.invoiceNumberingStart !== null ? Number(org.invoiceNumberingStart) : null,
      logoPath: org.logoPath,
      whatsappPhoneId: org.whatsappPhoneId,
      whatsappBusinessAccountId: org.whatsappBusinessAccountId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Get organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const validation = OnboardingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Update organization
    const result = await query(
      `UPDATE organizations 
       SET 
         address_street = $1,
         address_city = $2,
         address_zip = $3,
         address_country = $4,
         bank_account = $5,
         iban = $6,
         bank_name = $7,
         dic = $8,
         is_vat_payer = $9,
         default_vat_rate = $10,
         invoice_prefix = $11,
         invoice_numbering_start = $12,
         default_currency = $13,
         updated_at = NOW()
       WHERE id = $14
       RETURNING 
         id,
         name,
         ico,
         dic,
         is_vat_payer as "isVatPayer",
         address_street as "addressStreet",
         address_city as "addressCity",
         address_zip as "addressZip",
         address_country as "addressCountry",
         bank_account as "bankAccount",
         iban,
         bank_name as "bankName",
         default_currency as "defaultCurrency",
         default_vat_rate as "defaultVatRate",
         invoice_prefix as "invoicePrefix",
         invoice_numbering_start as "invoiceNumberingStart"`,
      [
        data.addressStreet,
        data.addressCity,
        data.addressZip,
        data.addressCountry,
        data.bankAccount || null,
        data.iban || null,
        data.bankName || null,
        data.dic || null,
        data.isVatPayer,
        data.defaultVatRate,
        data.invoicePrefix,
        data.invoiceNumberingStart,
        data.defaultCurrency,
        session.organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Organization updated successfully',
      organization: result.rows[0],
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
