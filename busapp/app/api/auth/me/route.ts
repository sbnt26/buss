export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Require authentication
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user and organization data
    const result = await query(
      `SELECT 
        u.id, u.email, u.full_name, u.role, u.organization_id,
        o.name as organization_name,
        o.ico as organization_ico,
        o.dic as organization_dic,
        o.address_street as organization_address_street,
        o.address_city as organization_address_city,
        o.address_zip as organization_address_zip,
        o.address_country as organization_address_country,
        o.bank_account as organization_bank_account,
        o.iban as organization_iban,
        o.bank_name as organization_bank_name,
        o.is_vat_payer as organization_is_vat_payer,
        o.default_vat_rate as organization_default_vat_rate,
        o.invoice_prefix as organization_invoice_prefix,
        o.invoice_numbering_start as organization_invoice_numbering_start,
        o.default_currency as organization_default_currency
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1 AND u.is_active = true`,
      [session.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      organizationId: user.organization_id,
      organization: {
        name: user.organization_name,
        ico: user.organization_ico,
        dic: user.organization_dic,
        addressStreet: user.organization_address_street,
        addressCity: user.organization_address_city,
        addressZip: user.organization_address_zip,
        addressCountry: user.organization_address_country,
        bankAccount: user.organization_bank_account,
        iban: user.organization_iban,
        bankName: user.organization_bank_name,
        isVatPayer: user.organization_is_vat_payer,
        defaultVatRate: user.organization_default_vat_rate
          ? parseFloat(user.organization_default_vat_rate)
          : null,
        invoicePrefix: user.organization_invoice_prefix,
        invoiceNumberingStart: user.organization_invoice_numbering_start,
        defaultCurrency: user.organization_default_currency,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
