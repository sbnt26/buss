import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { query } from '@/lib/db';
import {
  sendMessengerText,
  sendWhatsAppDocument,
  sendWhatsAppText,
  verifyMetaSignature,
} from '@/lib/meta-messaging';
import { handleIncomingMessage, type IncomingMessage } from '@/lib/whatsapp-flow';

type MetaEntry = {
  id?: string;
  changes?: Array<{
    value?: any;
  }>;
};

async function findOrganization(phoneNumberId?: string, businessAccountId?: string) {
  if (phoneNumberId) {
    const result = await query<IncomingOrganization>(
      `SELECT 
         id, name, ico, dic, is_vat_payer, address_street, address_city, address_zip,
         address_country, default_currency, COALESCE(default_vat_rate, 21) AS default_vat_rate,
         invoice_prefix
       FROM organizations
       WHERE whatsapp_phone_id = $1
       LIMIT 1`,
      [phoneNumberId]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }

  if (businessAccountId) {
    const result = await query<IncomingOrganization>(
      `SELECT 
         id, name, ico, dic, is_vat_payer, address_street, address_city, address_zip,
         address_country, default_currency, COALESCE(default_vat_rate, 21) AS default_vat_rate,
         invoice_prefix
       FROM organizations
       WHERE whatsapp_business_account_id = $1
       LIMIT 1`,
      [businessAccountId]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }
  return null;
}

interface IncomingOrganization {
  id: number;
  name: string;
  ico: string;
  dic: string | null;
  is_vat_payer: boolean;
  address_street: string;
  address_city: string;
  address_zip: string;
  address_country: string;
  default_currency: string;
  default_vat_rate: number;
  invoice_prefix: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifyMetaSignature(signature, raw)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  try {
    const payload = JSON.parse(raw) as { entry?: MetaEntry[] };

    if (!payload.entry) {
      return NextResponse.json({ success: true });
    }

    for (const entry of payload.entry) {
      if (!entry?.changes) continue;
      const memo = new Map<string, IncomingOrganization>();

      for (const change of entry.changes) {
        const value = change.value;
        if (!value) continue;

        const messagingProduct: 'whatsapp' | 'messenger' =
          value.messaging_product === 'messenger' ? 'messenger' : 'whatsapp';

        const messages = value.messages;
        if (!Array.isArray(messages)) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        const organization =
          memo.get(phoneNumberId || entry.id || '') ||
          (await findOrganization(phoneNumberId, entry.id));

        if (!organization) {
          console.warn('Unhandled meta webhook: organization not found', {
            phoneNumberId,
            businessAccountId: entry.id,
          });
          continue;
        }

        memo.set(phoneNumberId || entry.id || '', organization);

        for (const message of messages) {
          const text =
            messagingProduct === 'whatsapp' ? message.text?.body : message.text?.body ?? message.text;
          const from =
            messagingProduct === 'whatsapp'
              ? normalizePhone(message.from || '')
              : message.from?.id || '';

          if (!text || !from) continue;

          try {
            const result = await handleIncomingMessage({
              organization,
              phoneNumberId,
              from,
              messageId: message.id,
              text,
              timestamp: message.timestamp,
              messagingProduct,
            });

            for (const reply of result.replies) {
              if (!reply) continue;
              if (messagingProduct === 'whatsapp') {
                if (!phoneNumberId) {
                  console.warn('Missing phoneNumberId for WhatsApp reply');
                  continue;
                }
                await sendWhatsAppText(phoneNumberId, from, reply);
              } else {
                try {
                  await sendMessengerText(from, reply);
                } catch (err) {
                  console.error('Failed to send Messenger reply', err);
                }
              }
            }

            if (result.invoice) {
              if (messagingProduct === 'whatsapp' && phoneNumberId) {
                try {
                  await sendWhatsAppDocument(
                    phoneNumberId,
                    from,
                    `${result.invoice.invoiceNumber}.pdf`,
                    'application/pdf',
                    result.invoice.pdfBuffer
                  );
                  const nf = new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: result.invoice.currency,
                  });
                  await sendWhatsAppText(
                    phoneNumberId,
                    from,
                    `✅ Faktura ${result.invoice.invoiceNumber} byla vytvořena a odeslána. Celkem ${nf.format(
                      result.invoice.total
                    )}.`
                  );
                  await query('UPDATE invoices SET status = $1, sent_at = NOW() WHERE id = $2', [
                    'sent',
                    result.invoice.id,
                  ]);
                } catch (err) {
                  console.error('WhatsApp document send failed', err);
                  await query('UPDATE invoices SET status = $1 WHERE id = $2', ['draft', result.invoice.id]);
                  await sendWhatsAppText(
                    phoneNumberId,
                    from,
                    '⚠️ Faktura byla vytvořena, ale nepodařilo se ji odeslat do WhatsApp. Najdeš ji v BussApp.'
                  );
                }
              } else {
                try {
                  const nf = new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: result.invoice.currency,
                  });
                  await sendMessengerText(
                    from,
                    `✅ Faktura ${result.invoice.invoiceNumber} byla vytvořena. Celková částka ${nf.format(
                      result.invoice.total
                    )}. Soubor najdeš v BussApp webové aplikaci.`
                  );
                } catch (err) {
                  console.error('Messenger notification failed', err);
                }
              }
            }
          } catch (error) {
            console.error('Failed to process meta message', error);
            if (messagingProduct === 'whatsapp' && phoneNumberId) {
              await sendWhatsAppText(
                phoneNumberId,
                from,
                '❌ Došlo k chybě při zpracování. Prosím zkuste to znovu později.'
              );
            } else if (messagingProduct === 'messenger') {
              try {
                await sendMessengerText(from, '❌ Došlo k chybě při zpracování. Zkuste to znovu.');
              } catch (err) {
                console.error('Messenger error reply failed', err);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Meta webhook error', error);
    // Return 200 even on errors to avoid retries storm
  }

  return NextResponse.json({ success: true });
}
