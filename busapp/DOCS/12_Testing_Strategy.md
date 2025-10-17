# Testing Strategy
**Date:** 2025-10-15

## Overview
Comprehensive testing strategy for BussApp MVP covering unit tests, integration tests, E2E tests, and manual testing procedures.

## Testing Philosophy
- **Test critical paths** — Focus on invoice creation, WhatsApp flow, PDF generation, payment tracking
- **Fast feedback** — Unit tests run in <5s, full suite in <2min
- **Confidence over coverage** — 80%+ coverage on business logic, 100% on financial calculations
- **Production-like testing** — Use test WhatsApp sandbox, headless Chromium via Puppeteer, test database

## Testing Pyramid

```
        /\
       /E2E\         5% — Critical user flows (Playwright)
      /______\
     /        \
    /Integration\   25% — API, DB, external services (Jest)
   /____________\
  /              \
 /  Unit Tests    \ 70% — Pure functions, utilities (Jest)
/__________________\
```

## Tech Stack
- **Unit/Integration:** Jest + Testing Library
- **E2E:** Playwright
- **API Testing:** Supertest
- **Database:** PostgreSQL test database (Docker)
- **Mocking:** MSW (Mock Service Worker) for WhatsApp API
- **Coverage:** Jest coverage reports (target: 80%+)

---

## 1. Unit Tests

### Scope
Test pure functions, utilities, and business logic in isolation.

### Examples

#### Financial Calculations
```typescript
// tests/unit/calculations.test.ts
import { calculateInvoiceTotals, formatCurrency } from '@/lib/calculations';

describe('calculateInvoiceTotals', () => {
  it('should calculate totals correctly with VAT', () => {
    const items = [
      { quantity: 2, unitPrice: 1000, vatRate: 21 },
      { quantity: 1, unitPrice: 500, vatRate: 21 }
    ];
    
    const result = calculateInvoiceTotals(items);
    
    expect(result.subtotal).toBe(2500);
    expect(result.vatAmount).toBe(525);
    expect(result.total).toBe(3025);
  });

  it('should handle non-VAT items', () => {
    const items = [{ quantity: 1, unitPrice: 1000, vatRate: 0 }];
    const result = calculateInvoiceTotals(items);
    
    expect(result.subtotal).toBe(1000);
    expect(result.vatAmount).toBe(0);
    expect(result.total).toBe(1000);
  });
});
```

#### Invoice Numbering
```typescript
// tests/unit/numbering.test.ts
import { formatInvoiceNumber, parseInvoiceNumber } from '@/lib/numbering';

describe('formatInvoiceNumber', () => {
  it('should format number with prefix', () => {
    expect(formatInvoiceNumber('FV-', 2025, 1)).toBe('FV-2025-00001');
  });

  it('should format number without prefix', () => {
    expect(formatInvoiceNumber('', 2025, 123)).toBe('2025-00123');
  });
});
```

#### QR Code Generation
```typescript
// tests/unit/qr-payment.test.ts
import { generateQRPayload } from '@/lib/qr-payment';

describe('generateQRPayload', () => {
  it('should generate valid SPD 1.0 format', () => {
    const payload = generateQRPayload({
      iban: 'CZ6508000000192000145399',
      amount: 3025.50,
      currency: 'CZK',
      variableSymbol: '202500001',
      message: 'Faktura 2025-00001'
    });
    
    expect(payload).toContain('SPD*1.0');
    expect(payload).toContain('ACC:CZ6508000000192000145399');
    expect(payload).toContain('AM:3025.50');
    expect(payload).toContain('CC:CZK');
    expect(payload).toContain('X-VS:202500001');
  });
});
```

#### Date Utilities
```typescript
// tests/unit/dates.test.ts
import { calculateDueDate, isOverdue } from '@/lib/dates';

describe('calculateDueDate', () => {
  it('should add payment terms to issue date', () => {
    const issueDate = new Date('2025-01-15');
    const dueDate = calculateDueDate(issueDate, 14);
    expect(dueDate.toISOString()).toBe('2025-01-29T00:00:00.000Z');
  });
});

describe('isOverdue', () => {
  it('should detect overdue invoice', () => {
    const dueDate = new Date('2025-01-01');
    expect(isOverdue(dueDate, 'sent')).toBe(true);
  });

  it('should not mark paid invoice as overdue', () => {
    const dueDate = new Date('2025-01-01');
    expect(isOverdue(dueDate, 'paid')).toBe(false);
  });
});
```

### Run Unit Tests
```bash
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
```

---

## 2. Integration Tests

### Scope
Test API endpoints, database operations, and external service integrations.

### Setup Test Database
```typescript
// tests/setup/test-db.ts
import { Pool } from 'pg';

export async function setupTestDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_TEST_URL
  });
  
  // Run migrations
  await pool.query(fs.readFileSync('./migrations/001_initial_schema.sql', 'utf8'));
  
  return pool;
}

export async function teardownTestDatabase(pool: Pool) {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.end();
}
```

### Examples

#### Invoice Creation API
```typescript
// tests/integration/api/invoices.test.ts
import request from 'supertest';
import app from '@/app';
import { setupTestDatabase, teardownTestDatabase } from '@/tests/setup/test-db';

describe('POST /api/invoices/create', () => {
  let db: Pool;
  let authToken: string;

  beforeAll(async () => {
    db = await setupTestDatabase();
    authToken = await createTestUser(db);
  });

  afterAll(async () => {
    await teardownTestDatabase(db);
  });

  it('should create invoice and return invoice_id', async () => {
    const response = await request(app)
      .post('/api/invoices/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId: 1,
        items: [
          { description: 'Service', quantity: 1, unitPrice: 1000, vatRate: 21 }
        ],
        issueDate: '2025-01-15',
        dueDate: '2025-01-29'
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      invoiceId: expect.any(Number),
      invoiceNumber: expect.stringMatching(/2025-\d{5}/),
      pdfPath: expect.any(String)
    });

    // Verify in database
    const invoice = await db.query('SELECT * FROM invoices WHERE id = $1', [response.body.invoiceId]);
    expect(invoice.rows[0].total).toBe('1210.00');
  });

  it('should return 403 for unauthorized user', async () => {
    const response = await request(app)
      .post('/api/invoices/create')
      .send({ clientId: 1, items: [] });

    expect(response.status).toBe(403);
  });
});
```

#### WhatsApp Webhook Validation
```typescript
// tests/integration/api/whatsapp.test.ts
import request from 'supertest';
import crypto from 'crypto';
import app from '@/app';

describe('POST /api/wa/webhook', () => {
  it('should validate HMAC signature', async () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ id: 'msg123', from: '420123456789', text: { body: 'faktura' } }] } }] }]
    });

    const signature = 'sha256=' + crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET!)
      .update(body)
      .digest('hex');

    const response = await request(app)
      .post('/api/wa/webhook')
      .set('x-hub-signature-256', signature)
      .send(body);

    expect(response.status).toBe(200);
  });

  it('should reject invalid signature', async () => {
    const response = await request(app)
      .post('/api/wa/webhook')
      .set('x-hub-signature-256', 'sha256=invalid')
      .send({ entry: [] });

    expect(response.status).toBe(403);
  });
});
```

#### Invoice Numbering Race Condition
```typescript
// tests/integration/numbering-race.test.ts
describe('Invoice numbering under concurrency', () => {
  it('should generate unique sequential numbers', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      createInvoice({ clientId: 1, items: [{ quantity: 1, unitPrice: 100 }] })
    );

    const results = await Promise.all(promises);
    const numbers = results.map(r => r.invoiceNumber);

    // All numbers should be unique
    expect(new Set(numbers).size).toBe(10);

    // Numbers should be sequential
    const sequences = numbers.map(n => parseInt(n.split('-')[1]));
    sequences.sort((a, b) => a - b);
    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
```

### Run Integration Tests
```bash
npm run test:integration
npm run test:integration:watch
```

---

## 3. E2E Tests (Playwright)

### Scope
Test critical user journeys from UI to database, including WhatsApp flow simulation.

### Setup
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
```

### Test Fixtures
To make database checks available inside E2E specs, extend Playwright's base test with a Postgres helper:
```typescript
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test';
import { Pool } from 'pg';

type Fixtures = {
  db: Pool;
};

export const test = base.extend<Fixtures>({
  db: [
    async ({}, use) => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_TEST_URL
      });

      try {
        await use(pool);
      } finally {
        await pool.end();
      }
    },
    { scope: 'worker' }
  ]
});

export const expect = test.expect;
```
Then import `{ test, expect }` from this fixture file in specs that call `db.query(...)`.

### Examples

#### Complete Invoice Flow via WhatsApp
```typescript
// tests/e2e/whatsapp-invoice-flow.spec.ts
import { test, expect } from './fixtures';
import { simulateWhatsAppMessage } from './helpers/whatsapp-simulator';

test('should create invoice via WhatsApp chat', async ({ page }) => {
  // Simulate WhatsApp messages
  await simulateWhatsAppMessage('420123456789', 'faktura');
  
  // Check response (mock WhatsApp API response)
  expect(await getLastWhatsAppResponse()).toContain('Zadej IČO');

  // Send client info
  await simulateWhatsAppMessage('420123456789', '12345678\nTest Client\nPrague');
  expect(await getLastWhatsAppResponse()).toContain('Pošli položky');

  // Send items
  await simulateWhatsAppMessage('420123456789', 'Služba|1|1000');
  expect(await getLastWhatsAppResponse()).toContain('Subtotal: 1000');
  expect(await getLastWhatsAppResponse()).toContain('DPH 21%: 210');
  expect(await getLastWhatsAppResponse()).toContain('Celkem: 1210');

  // Confirm
  await simulateWhatsAppMessage('420123456789', 'ano');
  
  // Verify PDF was sent
  const lastMessage = await getLastWhatsAppMessage();
  expect(lastMessage.type).toBe('document');
  expect(lastMessage.document.filename).toMatch(/\.pdf$/);

  // Verify in CRM
  await page.goto('/app/invoices');
  await expect(page.locator('table tbody tr').first()).toContainText('Test Client');
  await expect(page.locator('table tbody tr').first()).toContainText('1210');
});
```

#### Web CRM Invoice Management
```typescript
// tests/e2e/crm-invoice-management.spec.ts
import { test, expect } from './fixtures';

test('should filter and export invoices', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to invoices
  await page.goto('/app/invoices');

  // Filter by status
  await page.selectOption('select[name="status"]', 'sent');
  await page.waitForLoadState('networkidle');
  
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(5);

  // Export CSV
  await page.click('button:has-text("Export CSV")');
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toMatch(/invoices_.*\.csv/);
});

test('should mark invoice as paid', async ({ page, db }) => {
  await page.goto('/app/invoices/1');
  
  await page.click('button:has-text("Označit jako zaplaceno")');
  await page.click('button:has-text("Potvrdit")');

  await expect(page.locator('.status-badge')).toContainText('Zaplaceno');
  
  // Verify in database
  const invoice = await db.query('SELECT status, paid_at FROM invoices WHERE id = 1');
  expect(invoice.rows[0].status).toBe('paid');
  expect(invoice.rows[0].paid_at).not.toBeNull();
});
```

### Run E2E Tests
```bash
npm run test:e2e
npm run test:e2e:headed # With browser visible
npm run test:e2e:debug
```

---

## 4. Manual Testing Checklist

### WhatsApp Flow Testing

#### Happy Path
- [ ] Send "faktura" → receives prompt for client info
- [ ] Provide IČO + details → client created/found
- [ ] Send items (name|qty|price) → receives preview with totals
- [ ] Confirm with "ano" → receives PDF within 2 minutes
- [ ] PDF opens correctly, QR code scans successfully
- [ ] Invoice appears in CRM with status "sent"

#### Edge Cases
- [ ] Invalid IČO → receives error message
- [ ] Malformed item (missing price) → receives error, stays in same state
- [ ] Timeout after 60 min → receives timeout message, state resets
- [ ] Rate limit exceeded (>10 msgs/min) → receives rate limit message
- [ ] Send "zrušit" → conversation resets to idle

#### Non-VAT Payer
- [ ] Invoice without DPH fields
- [ ] PDF contains "Neplátce DPH"
- [ ] Totals calculated correctly (no VAT)

### Web CRM Testing

#### Dashboard
- [ ] KPIs display correctly (revenue, VAT, unpaid count)
- [ ] Charts render with real data
- [ ] Recent invoices list shows last 10

#### Invoice List
- [ ] Pagination works (50 items per page)
- [ ] Filters: status, date range, client → correct results
- [ ] Search by invoice number → finds invoice
- [ ] CSV export downloads correct data
- [ ] Bulk actions: mark multiple as paid

#### Invoice Detail
- [ ] All metadata displays correctly
- [ ] PDF downloads successfully
- [ ] Timeline shows audit log events
- [ ] Status change → audit log created
- [ ] Resend to WhatsApp → PDF sent again

#### Clients
- [ ] Create new client → saves to DB
- [ ] Edit client → updates invoices
- [ ] Delete client → blocked if has invoices

#### Settings
- [ ] Update company details → reflected in next invoice PDF
- [ ] Change invoice prefix → next invoice uses new prefix
- [ ] Upload logo → appears in PDF header

### Security Testing
- [ ] Unauthenticated user → redirected to login
- [ ] Staff user → cannot access other organization's invoices
- [ ] Admin user → full access to their organization
- [ ] HMAC validation → invalid signature rejected (403)
- [ ] SQL injection attempts → safely handled
- [ ] XSS attempts in invoice notes → sanitized

### Performance Testing
- [ ] 100 invoices created in 1 hour → all successful
- [ ] PDF generation < 5 seconds
- [ ] WhatsApp delivery < 120 seconds
- [ ] CRM list with 10,000 invoices → loads in <2s
- [ ] Database query performance (EXPLAIN ANALYZE)

---

## 5. Test Data Management

### Seed Test Data
```typescript
// tests/setup/seed.ts
export async function seedTestData(db: Pool) {
  // Organization
  await db.query(`
    INSERT INTO organizations (id, name, ico, dic, is_vat_payer, address_street, address_city, address_zip, iban)
    VALUES (1, 'Test s.r.o.', '12345678', 'CZ12345678', true, 'Test St 1', 'Prague', '11000', 'CZ65...')
  `);

  // Users
  await db.query(`
    INSERT INTO users (email, password_hash, full_name, role, organization_id)
    VALUES 
      ('admin@test.com', '$2b$12$...', 'Admin User', 'admin', 1),
      ('staff@test.com', '$2b$12$...', 'Staff User', 'staff', 1)
  `);

  // Clients
  await db.query(`
    INSERT INTO clients (organization_id, name, ico, address_city, whatsapp_phone)
    VALUES 
      (1, 'Client A', '87654321', 'Brno', '420987654321'),
      (1, 'Client B', '11223344', 'Ostrava', '420111222333')
  `);

  // Invoices (various statuses)
  // ... generate 100+ test invoices
}
```

### Cleanup After Tests
```typescript
afterEach(async () => {
  await db.query('TRUNCATE invoices, invoice_items, clients, audit_log RESTART IDENTITY CASCADE');
});
```

---

## 6. CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: invoicer_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_TEST_URL: postgresql://test:test@localhost:5432/invoicer_test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 7. Test Coverage Goals

| Layer | Coverage Target | Priority |
|-------|----------------|----------|
| Financial calculations | 100% | Critical |
| Invoice numbering | 100% | Critical |
| QR payment generation | 100% | Critical |
| WhatsApp FSM logic | 90% | High |
| API endpoints | 80% | High |
| PDF rendering | 70% | Medium |
| UI components | 60% | Medium |

---

## 8. Testing Commands Summary

```bash
# All tests
npm test

# Unit tests only
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug

# Coverage report
npm run test:coverage
npm run test:coverage:open

# Specific test file
npm test -- calculations.test.ts

# Watch mode
npm test -- --watch
```

---

## 9. Quality Gates

Before merging to `main`:
- ✅ All tests pass
- ✅ Coverage >= 80% on new code
- ✅ No console errors/warnings
- ✅ Linter passes (ESLint)
- ✅ Type checks pass (TypeScript)

Before deploying to production:
- ✅ All CI tests pass
- ✅ Manual testing checklist completed
- ✅ Performance tests pass
- ✅ Security scan clean (npm audit)


