# Backend Implementation

## Architecture
- Next.js 14 (App Router) route handlers for API.
- Postgres 16 for data, FSM sessions, counters, audit.
- Headless Chromium (Puppeteer) for HTML→PDF.
- Filesystem for PDF storage.

## Key Endpoints
- `GET /api/wa/webhook` — verify token for WhatsApp webhook.
- `POST /api/wa/webhook` — receive messages (HMAC signature validation, dedup, FSM).
- `POST /api/invoices/preview` — compute totals for confirmation.
- `POST /api/invoices/create` — upsert client, number invoice, store items, render PDF, save to FS.
- `GET /api/invoices/:id/pdf` — stream PDF via API proxy (authz to org).

## Conversation FSM (states)
`idle → awaiting_client → awaiting_items → awaiting_dates → confirm → done`  
Timeout 60 min; rate limit 10 msgs/min/phone.

### State Transitions & Actions

| Current State | User Input | Validation | Next State | Action |
|--------------|-----------|-----------|-----------|--------|
| `idle` | "faktura" | - | `awaiting_client` | Reply: "Zadej IČO nebo 'nový'" |
| `awaiting_client` | IČO (8 digits) | Valid IČO format | `awaiting_items` | Find/create client, reply: "Pošli položky" |
| `awaiting_client` | "nový\nName\nCity" | Non-empty strings | `awaiting_items` | Create new client without IČO |
| `awaiting_items` | "Item\|qty\|price" | Positive numbers | `awaiting_items` | Add item, reply current list |
| `awaiting_items` | "hotovo" | At least 1 item | `awaiting_dates` | Reply: "Zadej datumy (YYYY-MM-DD)" |
| `awaiting_dates` | "2025-01-15" | Valid date | `confirm` | Set issue_date=input, due_date=+14d, show preview |
| `awaiting_dates` | "2025-01-15\|2025-02-15" | Valid dates | `confirm` | Set both dates, show preview |
| `confirm` | "ano" | - | `done` | Create invoice, render PDF, send to WA |
| `confirm` | "ne" | - | `awaiting_items` | Return to edit items |
| `any` | "zrušit" | - | `idle` | Clear context, reply: "Zrušeno" |

## Numbering (race-safe)
UPSERT into `counters(organization_id, year, last_seq)`; number format: `{prefix}YYYY-#####`; VS = number without prefix/dashes.

### Implementation
```sql
-- Atomically increment counter and get new sequence
INSERT INTO counters (organization_id, year, last_seq)
VALUES ($1, $2, 1)
ON CONFLICT (organization_id, year)
DO UPDATE SET 
  last_seq = counters.last_seq + 1,
  updated_at = NOW()
RETURNING last_seq;
```

### Format Examples
- Prefix `""`, year 2025, seq 1 → `2025-00001`, VS: `202500001`
- Prefix `"FV-"`, year 2025, seq 123 → `FV-2025-00123`, VS: `2025000123`
- Variable Symbol: remove prefix and dashes, pad to 10 digits

## PDF Render
- Handlebars HTML template, blocks: supplier, buyer, items, recap, QR.
- CZ QR payload (SPD 1.0): `SPD*1.0*ACC:IBAN*AM:amount*CC:CZK*X-VS:VS*RN:Supplier`.
- Render HTML with Puppeteer; save PDF to `/data/invoices/{orgId}/{year}/{number}.pdf`.

### VAT vs Non-VAT Templates
**VAT Payer (`is_vat_payer = true`):**
- Show DIČ (VAT ID) in supplier block
- Item table columns: Description, Qty, Unit Price, VAT Rate, Subtotal, VAT, Total
- Recap: Subtotal, VAT 21%, **Total with VAT**

**Non-VAT Payer (`is_vat_payer = false`):**
- No DIČ in supplier block
- Add text: **"Neplátce DPH dle §6 zákona o DPH"**
- Item table columns: Description, Qty, Unit Price, Total (no VAT columns)
- Recap: **Total** (no VAT breakdown)
- QR code: same format (amount = total)

### Puppeteer Flow
```typescript
const browser = await getBrowser(); // lazy singleton
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.emulateMediaType('screen');
const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
await page.close();
```

## Security
- Validate `x-hub-signature-256` (HMAC SHA‑256 with WA_APP_SECRET).
- API auth with session cookie/JWT; RBAC (admin/staff).
- Stream PDFs; never issue public URLs.
- Deduplicate WA messages by `messages[0].id`.

## Rate Limiting

### WhatsApp Messages
**Rule:** 10 messages per phone number per minute
**Implementation:** Use `wa_rate_limits` table with sliding window

```typescript
async function checkRateLimit(phone: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60000); // 1 minute ago

  // Bucket by minute so ON CONFLICT resolves correctly
  await db.query(`
    INSERT INTO wa_rate_limits (whatsapp_phone, window_start, message_count)
    VALUES ($1, date_trunc('minute', NOW()), 1)
    ON CONFLICT (whatsapp_phone, window_start)
    DO UPDATE SET message_count = wa_rate_limits.message_count + 1,
                  updated_at = NOW()
  `, [phone]);

  // Sum all buckets that fall inside the rolling window
  const totalInWindow = await db.query<{
    total: string | null;
  }>(`
    SELECT COALESCE(SUM(message_count), 0) AS total
    FROM wa_rate_limits
    WHERE whatsapp_phone = $1
      AND window_start >= date_trunc('minute', $2::timestamptz)
  `, [phone, windowStart.toISOString()]);

  return Number(totalInWindow.rows[0].total) <= 10;
}
```

**Response when rate limited:**
```
"⚠️ Příliš mnoho zpráv. Zkus to za chvíli."
```

### API Endpoints
- Web dashboard: 100 requests/min per IP (using middleware like `express-rate-limit`)
- Invoice creation API: 20 requests/min per authenticated user

## Error Handling

### WhatsApp FSM Errors

| Error Type | User Message | Internal Action | Retry? |
|-----------|-------------|----------------|--------|
| Invalid IČO format | "❌ Neplatné IČO. Zadej 8 číslic." | Stay in `awaiting_client` | Yes |
| Item parse error | "❌ Špatný formát. Použij: název\|množství\|cena" | Stay in `awaiting_items` | Yes |
| Invalid date | "❌ Neplatné datum. Formát: YYYY-MM-DD" | Stay in `awaiting_dates` | Yes |
| Database error | "⚠️ Chyba systému. Zkus to znovu." | Log error, reset to `idle` | Yes |
| PDF generation failed | "⚠️ Nepodařilo se vytvořit PDF. Kontaktuj podporu." | Log error, keep invoice as `draft` | Manual |
| WhatsApp send failed | "✅ Faktura vytvořena, ale odeslání selhalo. Najdeš ji v CRM." | Log error, invoice saved | Manual |
| Timeout (60 min) | "⏱️ Časový limit vypršel. Začni znovu s 'faktura'." | Reset conversation to `idle` | Yes |
| Rate limit exceeded | "⚠️ Příliš mnoho zpráv. Zkus to za chvíli." | Block further processing | Wait |

### Timeout Handling
- Set `timeout_at = NOW() + INTERVAL '60 minutes'` when conversation starts
- Cron job runs every 5 minutes:
```sql
-- Find expired conversations
SELECT id, whatsapp_phone FROM wa_conversations
WHERE state != 'idle' AND state != 'done' AND timeout_at < NOW();

-- Send timeout message via WhatsApp API
-- Then reset:
UPDATE wa_conversations
SET state = 'idle', context = '{}', timeout_at = NULL
WHERE id = ...;
```

### Global Error Handler (Next.js)
```typescript
// app/api/error-handler.ts
export function handleApiError(error: unknown, context: string) {
  const errorId = crypto.randomUUID();
  
  console.error({
    errorId,
    context,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Send to Sentry (optional)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: { errorId, context } });
  }
  
  return {
    error: 'Internal server error',
    errorId, // Return to client for support reference
    message: process.env.NODE_ENV === 'development' 
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'An error occurred. Please try again.'
  };
}
```

### Retry Strategy
- **WhatsApp message send:** 3 retries with exponential backoff (1s, 2s, 4s)
- **Puppeteer PDF generation:** lazy singleton Chromium instance, auto-restart on failure
- **Database deadlocks:** Automatic retry with transaction isolation level `SERIALIZABLE`

## Validation

### Input Validation (Zod schemas)
```typescript
// schemas/invoice.ts
import { z } from 'zod';

export const InvoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().positive().max(9999999),
  vatRate: z.number().min(0).max(100),
  unit: z.string().max(20).default('ks')
});

export const CreateInvoiceSchema = z.object({
  clientId: z.number().int().positive(),
  items: z.array(InvoiceItemSchema).min(1).max(100),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional()
}).refine(data => new Date(data.dueDate) >= new Date(data.issueDate), {
  message: "Due date must be after issue date"
});
```

### WhatsApp Input Parsing
```typescript
function parseItems(text: string): InvoiceItem[] {
  const lines = text.split('\n').filter(l => l.trim());
  const items = [];
  
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length !== 3) {
      throw new ValidationError('Formát: název|množství|cena');
    }
    
    const [description, qtyStr, priceStr] = parts;
    const quantity = parseFloat(qtyStr);
    const unitPrice = parseFloat(priceStr);
    
    if (isNaN(quantity) || quantity <= 0) {
      throw new ValidationError('Množství musí být kladné číslo');
    }
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new ValidationError('Cena musí být kladné číslo');
    }
    
    items.push({ description, quantity, unitPrice, vatRate: 21 }); // Default VAT
  }
  
  return items;
}
```

## Backups
- Daily `pg_dump` + rsync PDFs to secondary storage.
- Backup script runs via cron (see `11_Deployment_Guide.md`).
- Retention: 30 days for daily backups, 12 months for monthly backups.
