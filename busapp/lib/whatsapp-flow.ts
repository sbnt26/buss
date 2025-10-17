import { transaction, query } from './db';
import { calculateInvoiceTotals, type InvoiceItem } from './invoice-calculations';
import { getNextInvoiceNumber, formatInvoiceNumber, generateVariableSymbol } from './invoice-numbering';
import { renderInvoiceHTML } from './pdf-template';
import { renderHTMLToPDF } from './pdf-generator';
import { savePDF, getPDFBuffer } from './file-storage';
import { config } from './config';

interface OrganizationInfo {
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

interface ConversationContext {
  clientId?: number;
  clientName?: string;
  clientCity?: string;
  items: InvoiceItem[];
  issueDate?: string;
  dueDate?: string;
}

interface MessageResult {
  replies: string[];
  invoice?: {
    id: number;
    invoiceNumber: string;
    pdfPath: string;
    clientName: string;
    total: number;
    currency: string;
    pdfBuffer: Buffer;
  };
}

export interface IncomingMessage {
  organization: OrganizationInfo;
  phoneNumberId?: string;
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
  messagingProduct: 'whatsapp' | 'messenger';
}

const numberFormatter = (currency: string) =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
  });

async function checkRateLimit(client: any, phone: string): Promise<boolean> {
  await client.query(
    `
      INSERT INTO wa_rate_limits (whatsapp_phone, window_start, message_count)
      VALUES ($1, date_trunc('minute', NOW()), 1)
      ON CONFLICT (whatsapp_phone, window_start)
      DO UPDATE SET message_count = wa_rate_limits.message_count + 1,
                    updated_at = NOW()
    `,
    [phone]
  );

  const totalInWindow = await client.query(
    `
      SELECT COALESCE(SUM(message_count), 0) AS total
      FROM wa_rate_limits
      WHERE whatsapp_phone = $1
        AND window_start >= date_trunc('minute', NOW() - interval '1 minute')
    `,
    [phone]
  );

  const total = Number(totalInWindow.rows?.[0]?.total ?? 0);
  return total <= config.rateLimit.waMessagesPerMin;
}

function ensureContext(raw: any): ConversationContext {
  if (raw && typeof raw === 'object') {
    return {
      clientId: raw.clientId ?? undefined,
      clientName: raw.clientName ?? undefined,
      clientCity: raw.clientCity ?? undefined,
      items: Array.isArray(raw.items) ? raw.items : [],
      issueDate: raw.issueDate ?? undefined,
      dueDate: raw.dueDate ?? undefined,
    };
  }
  return {
    items: [],
  };
}

function parseItems(text: string): InvoiceItem[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items: InvoiceItem[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length !== 3) {
      throw new Error('Formát položek: popis|množství|cena');
    }

    const [description, qtyStr, priceStr] = parts;
    const quantity = Number(qtyStr.replace(',', '.'));
    const unitPrice = Number(priceStr.replace(',', '.'));

    if (!description) {
      throw new Error('Popis položky je povinný');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Množství musí být kladné číslo');
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error('Cena musí být kladné číslo');
    }

    items.push({
      description,
      quantity,
      unitPrice,
      vatRate: 21,
      unit: 'ks',
    });
  }

  return items;
}

function normalizeDateInput(input: string): { issueDate: string; dueDate: string } {
  const parts = input
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);

  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (parts.length === 1) {
    if (!isoRegex.test(parts[0])) {
      throw new Error('Datum musí být ve formátu YYYY-MM-DD');
    }
    const issueDate = parts[0];
    const issue = new Date(issueDate);
    if (Number.isNaN(issue.getTime())) {
      throw new Error('Datum je neplatné');
    }
    const due = new Date(issue);
    due.setDate(due.getDate() + 14);
    const dueDate = due.toISOString().slice(0, 10);
    return { issueDate, dueDate };
  }

  if (parts.length === 2) {
    if (!isoRegex.test(parts[0]) || !isoRegex.test(parts[1])) {
      throw new Error('Datum musí být ve formátu YYYY-MM-DD');
    }
    const issue = new Date(parts[0]);
    const due = new Date(parts[1]);
    if (Number.isNaN(issue.getTime()) || Number.isNaN(due.getTime())) {
      throw new Error('Datum je neplatné');
    }
    if (due.getTime() < issue.getTime()) {
      throw new Error('Datum splatnosti musí být po datu vystavení');
    }
    return { issueDate: parts[0], dueDate: parts[1] };
  }

  throw new Error('Zadej datum nebo "datum|splatnost" ve formátu YYYY-MM-DD');
}

function formatItemsSummary(items: InvoiceItem[], currency: string): string {
  const nf = numberFormatter(currency);
  const lines = items.map(
    (item, index) => `${index + 1}. ${item.description} — ${item.quantity} × ${nf.format(item.unitPrice)}`
  );
  return lines.join('\n');
}

async function getOrCreateClient(
  client: any,
  organizationId: number,
  ico: string
): Promise<{ id: number; name: string }> {
  const existing = await client.query(
    'SELECT id, name FROM clients WHERE organization_id = $1 AND ico = $2 LIMIT 1',
    [organizationId, ico]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const placeholderName = `Klient ${ico}`;
  const inserted = await client.query(
    `INSERT INTO clients (organization_id, name, ico, address_city, created_at, updated_at)
     VALUES ($1, $2, $3, '', NOW(), NOW())
     RETURNING id, name`,
    [organizationId, placeholderName, ico]
  );

  return inserted.rows[0];
}

async function createAdHocClient(
  client: any,
  organizationId: number,
  name: string,
  city: string
): Promise<{ id: number; name: string }> {
  const inserted = await client.query(
    `INSERT INTO clients (organization_id, name, address_city, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id, name`,
    [organizationId, name, city]
  );

  return inserted.rows[0];
}

async function createInvoiceFromConversation(
  client: any,
  organization: OrganizationInfo,
  context: ConversationContext,
  userPhone: string
): Promise<{ id: number; invoiceNumber: string; pdfPath: string; total: number }> {
  if (!context.clientId || context.items.length === 0 || !context.issueDate || !context.dueDate) {
    throw new Error('Chybí data pro vytvoření faktury');
  }

  const organizationIsVatPayer = Boolean(organization.is_vat_payer) || Boolean(organization.dic);

  const totals = calculateInvoiceTotals(context.items, organizationIsVatPayer);
  const issueDate = new Date(context.issueDate);
  const dueDate = new Date(context.dueDate);

  const year = issueDate.getFullYear();
  const sequence = await getNextInvoiceNumber(organization.id, year, client);
  const invoiceNumber = formatInvoiceNumber(organization.invoice_prefix, year, sequence);
  const variableSymbol = generateVariableSymbol(invoiceNumber);

  const invoiceResult = await client.query(
    `INSERT INTO invoices (
        organization_id, client_id, invoice_number, variable_symbol,
        status, issue_date, due_date, currency, subtotal, vat_amount, total,
        created_by, created_via, notes, sent_at
      )
      VALUES ($1, $2, $3, $4, 'sent', $5, $6, $7, $8, $9, $10, NULL, 'whatsapp', $11, NOW())
      RETURNING id`,
    [
      organization.id,
      context.clientId,
      invoiceNumber,
      variableSymbol,
      context.issueDate,
      context.dueDate,
      organization.default_currency,
      totals.subtotal,
      totals.vatAmount,
      totals.total,
      null,
    ]
  );

  const invoiceId = invoiceResult.rows[0].id;

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

  const html = await renderInvoiceHTML(
    {
      invoiceNumber,
      variableSymbol,
      issueDate,
      dueDate,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      currency: organization.default_currency,
      notes: undefined,
    },
    {
      name: organization.name,
      ico: organization.ico,
      dic: organization.dic ?? undefined,
      isVatPayer: organizationIsVatPayer,
      addressStreet: organization.address_street,
      addressCity: organization.address_city,
      addressZip: organization.address_zip,
      bankAccount: undefined,
      iban: undefined,
      bankName: undefined,
      logoPath: undefined,
    },
    {
      name: context.clientName ?? 'Klient',
      addressCity: context.clientCity,
    },
    totals.items.map((item, index) => ({
      position: index + 1,
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
  const pdfPath = await savePDF(pdfBuffer, organization.id, year, invoiceNumber);

  await client.query('UPDATE invoices SET pdf_path = $1, updated_at = NOW() WHERE id = $2', [
    pdfPath,
    invoiceId,
  ]);

  await client.query(
    `INSERT INTO audit_log (
      organization_id, user_id, entity_type, entity_id, action, changes
    ) VALUES ($1, NULL, 'invoice', $2, 'created', $3)`,
    [
      organization.id,
      invoiceId,
      JSON.stringify({ invoiceNumber, total: totals.total, createdVia: 'whatsapp', whatsappPhone: userPhone }),
    ]
  );

  return { id: invoiceId, invoiceNumber, pdfPath, total: totals.total };
}

export async function handleIncomingMessage(message: IncomingMessage): Promise<MessageResult> {
  if (!message.text?.trim()) {
    return { replies: [] };
  }

  const normalizedText = message.text.trim();
  const lower = normalizedText.toLowerCase();

  return transaction(async (client) => {
    const dedup = await client.query(
      'INSERT INTO wa_message_cache (message_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING message_id',
      [message.messageId]
    );

    if (dedup.rowCount === 0) {
      return { replies: [] };
    }

    if (!(await checkRateLimit(client, message.from))) {
      return { replies: ['⚠️ Příliš mnoho zpráv. Zkus to za chvíli.'] };
    }

    const convoRes = await client.query(
      'SELECT * FROM wa_conversations WHERE organization_id = $1 AND whatsapp_phone = $2 FOR UPDATE',
      [message.organization.id, message.from]
    );

    let conversation = convoRes.rows[0];
    if (!conversation) {
      const insert = await client.query(
        `INSERT INTO wa_conversations (organization_id, whatsapp_phone, state, context, created_at, updated_at)
         VALUES ($1, $2, 'idle', $3, NOW(), NOW())
         RETURNING *`,
        [message.organization.id, message.from, JSON.stringify({ items: [] })]
      );
      conversation = insert.rows[0];
    }

    const context = ensureContext(conversation.context);
    let state: string = conversation.state || 'idle';
    const replies: string[] = [];

    const finishConversation = async (nextState: string, nextContext: ConversationContext) => {
      await client.query(
        `UPDATE wa_conversations
         SET state = $1, context = $2, updated_at = NOW(), last_message_id = $3, timeout_at = NULL
         WHERE id = $4`,
        [nextState, nextContext, message.messageId, conversation.id]
      );
    };

    // Handle cancel
    if (['zrušit', 'zrusit', 'cancel'].includes(lower)) {
      await finishConversation('idle', { items: [] });
      return { replies: ['❌ Proces zrušen. Napiš "faktura" pro začátek.'] };
    }

    if (state === 'idle') {
      if (lower.includes('faktura')) {
        await finishConversation('awaiting_client', { items: [] });
        replies.push("Skvěle! Zadej IČO klienta (8 číslic) nebo napiš 'nový' a na další řádky jméno a město:\n`nový\nJan Novák\nPraha`");
        return { replies };
      }
      replies.push("👋 Vítej v BussApp! Napiš 'faktura' pro zahájení.");
      return { replies };
    }

    if (state === 'awaiting_client') {
      try {
        if (/^\d{8}$/.test(normalizedText)) {
          const clientData = await getOrCreateClient(client, message.organization.id, normalizedText);
          context.clientId = clientData.id;
          context.clientName = clientData.name;
          await finishConversation('awaiting_items', context);
          replies.push(
            `Klient ${clientData.name} připraven.\nPošli položky ve formátu \`popis|množství|cena\` nebo napiš 'hotovo'.`
          );
          return { replies };
        }

        if (lower.startsWith('nov') || lower.startsWith('nový')) {
          const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length < 3) {
            throw new Error("Formát: `nový` + jméno + město na nových řádcích. Např. `nový\\nJan Novák\\nPraha`");
          }
          const name = lines[1];
          const city = lines[2];
          const clientData = await createAdHocClient(client, message.organization.id, name, city);
          context.clientId = clientData.id;
          context.clientName = clientData.name;
          context.clientCity = city;
          await finishConversation('awaiting_items', context);
          replies.push(
            `Klient ${clientData.name} vytvořen.\nPošli položky ve formátu \`popis|množství|cena\` nebo napiš 'hotovo'.`
          );
          return { replies };
        }

        throw new Error(
          "Neznámý formát. Zadej IČO (8 číslic) nebo použij formát `nový\\nJméno\\nMěsto`."
        );
      } catch (error) {
        replies.push(error instanceof Error ? error.message : 'Neplatný vstup.');
        await finishConversation('awaiting_client', context);
        return { replies };
      }
    }

    if (state === 'awaiting_items') {
      if (lower === 'hotovo') {
        if (!context.items || context.items.length === 0) {
          replies.push('Přidej alespoň jednu položku před dokončením.');
          await finishConversation('awaiting_items', context);
          return { replies };
        }
        await finishConversation('awaiting_dates', context);
        replies.push(
          'Skvělé! Zadej datum vystavení nebo vystavení a splatnost.\nPříklad: `2025-01-15` nebo `2025-01-15|2025-01-30`.'
        );
        return { replies };
      }

      try {
        const newItems = parseItems(normalizedText);
        context.items = [...(context.items || []), ...newItems];
        await finishConversation('awaiting_items', context);
        const summary = formatItemsSummary(context.items, message.organization.default_currency);
        replies.push(`Položky přidány:\n${summary}\n\nPokračuj v přidávání nebo napiš 'hotovo'.`);
        return { replies };
      } catch (error) {
        replies.push(error instanceof Error ? error.message : 'Neplatný formát položek.');
        await finishConversation('awaiting_items', context);
        return { replies };
      }
    }

    if (state === 'awaiting_dates') {
      try {
        const range = normalizeDateInput(normalizedText);
        context.issueDate = range.issueDate;
        context.dueDate = range.dueDate;
        await finishConversation('confirm', context);

        const totals = calculateInvoiceTotals(
          context.items,
          Boolean(message.organization.is_vat_payer) || Boolean(message.organization.dic)
        );
        const nf = numberFormatter(message.organization.default_currency);

        replies.push(
          `Shrnutí:\nKlient: ${context.clientName}\nPoložky:\n${formatItemsSummary(
            context.items,
            message.organization.default_currency
          )}\n\nDatum vystavení: ${context.issueDate}\nSplatnost: ${context.dueDate}\nCelkem: ${nf.format(
            totals.total
          )}\n\nOdeslat fakturu? Odpověz 'ano' nebo 'ne'.`
        );
        return { replies };
      } catch (error) {
        replies.push(error instanceof Error ? error.message : 'Neplatný formát data.');
        await finishConversation('awaiting_dates', context);
        return { replies };
      }
    }

    if (state === 'confirm') {
      if (lower === 'ano') {
        const invoice = await createInvoiceFromConversation(
          client,
          message.organization,
          context,
          message.from
        );

        const pdfBuffer = await getPDFBuffer(invoice.pdfPath);

        await client.query(
          `UPDATE wa_conversations
           SET state = 'idle', context = $1, updated_at = NOW(), last_message_id = $2, timeout_at = NULL
           WHERE id = $3`,
          [JSON.stringify({ items: [] }), message.messageId, conversation.id]
        );

        return {
          replies,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            pdfPath: invoice.pdfPath,
            clientName: context.clientName ?? 'Klient',
            total: invoice.total,
            currency: message.organization.default_currency,
            pdfBuffer,
          },
        };
      }

      if (lower === 'ne') {
        await finishConversation('awaiting_items', context);
        replies.push('OK, můžeš upravit položky. Přidej další nebo napiš znovu "hotovo".');
        return { replies };
      }

      replies.push("Odpověz 'ano' pro odeslání faktury nebo 'ne' pro úpravu položek.");
      await finishConversation('confirm', context);
      return { replies };
    }

    await finishConversation(state, context);
    replies.push('Nerozumím. Napiš "faktura" pro začátek.');
    return { replies };
  });
}
