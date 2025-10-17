import crypto from 'crypto';

process.env.WHATSAPP_VERIFY_TOKEN = 'verify-token';
process.env.WHATSAPP_APP_SECRET = 'secret-token';
process.env.WHATSAPP_ACCESS_TOKEN = 'access-token';

const sendWhatsAppText = jest.fn();
const sendWhatsAppDocument = jest.fn();
const sendMessengerText = jest.fn();
const handleIncomingMessage = jest.fn();
const queryMock = jest.fn();

jest.mock('@/lib/meta-messaging', () => {
  const actual = jest.requireActual('@/lib/meta-messaging');
  return {
    ...actual,
    sendWhatsAppText: sendWhatsAppText,
    sendWhatsAppDocument: sendWhatsAppDocument,
    sendMessengerText: sendMessengerText,
  };
});

jest.mock('@/lib/whatsapp-flow', () => ({
  handleIncomingMessage: handleIncomingMessage,
}));

jest.mock('@/lib/db', () => ({
  query: queryMock,
}));

let GET: typeof import('@/app/api/wa/webhook/route').GET;
let POST: typeof import('@/app/api/wa/webhook/route').POST;

beforeAll(async () => {
  ({ GET, POST } = await import('@/app/api/wa/webhook/route'));
});

beforeEach(() => {
  jest.clearAllMocks();
});

const organizationRow = {
  id: 1,
  name: 'Org',
  ico: '12345678',
  dic: null,
  is_vat_payer: true,
  address_street: 'Street 1',
  address_city: 'City',
  address_zip: '11000',
  address_country: 'CZ',
  default_currency: 'CZK',
  default_vat_rate: 21,
  invoice_prefix: 'FV',
};

describe('GET /api/wa/webhook', () => {
  it('returns challenge when verify token matches', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/wa/webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=test123'
      )
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('test123');
  });

  it('rejects invalid token', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/wa/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc'
      )
    );

    expect(response.status).toBe(403);
  });
});

describe('POST /api/wa/webhook', () => {
  beforeEach(() => {
    queryMock.mockImplementation((sql: string) => {
      if (sql.includes('FROM organizations')) {
        return Promise.resolve({ rowCount: 1, rows: [organizationRow] });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
  });

  it('rejects requests with invalid signature', async () => {
    const body = JSON.stringify({ entry: [] });
    const request = new Request('http://localhost/api/wa/webhook', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('processes WhatsApp message and sends responses', async () => {
    handleIncomingMessage.mockResolvedValueOnce({
      replies: ['Ahoj'],
      invoice: {
        id: 10,
        invoiceNumber: '2025-00001',
        pdfPath: '1/2025/2025-00001.pdf',
        clientName: 'Klient',
        total: 1000,
        currency: 'CZK',
        pdfBuffer: Buffer.from('pdf'),
      },
    });

    const payload = {
      entry: [
        {
          id: 'business-id',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: '12345' },
                messages: [
                  {
                    id: 'wamid.1',
                    from: '420123456789',
                    text: { body: 'faktura' },
                    timestamp: `${Date.now()}`,
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const body = JSON.stringify(payload);
    const signature =
      'sha256=' + crypto.createHmac('sha256', 'secret-token').update(body, 'utf8').digest('hex');

    const response = await POST(
      new Request('http://localhost/api/wa/webhook', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': signature,
        },
      })
    );

    expect(response.status).toBe(200);
    expect(handleIncomingMessage).toHaveBeenCalled();
    expect(sendWhatsAppText).toHaveBeenCalledWith('12345', '420123456789', 'Ahoj');
    expect(sendWhatsAppDocument).toHaveBeenCalled();
  });
});
