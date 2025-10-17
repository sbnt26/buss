/** @jest-environment node */

import type { SessionData } from '@/lib/auth';
import { PATCH } from '@/app/api/organization/route';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

jest.mock('@/lib/auth', () => ({
  getSessionFromRequest: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

const mockedGetSessionFromRequest = getSessionFromRequest as jest.MockedFunction<
  typeof getSessionFromRequest
>;
const mockedQuery = query as jest.MockedFunction<typeof query>;

const session: SessionData = {
  userId: 5,
  organizationId: 77,
  role: 'admin',
  email: 'admin@example.com',
  exp: 0,
  iat: 0,
};

beforeEach(() => {
  mockedGetSessionFromRequest.mockReset();
  mockedQuery.mockReset();
});

describe('/api/organization PATCH', () => {
  const validPayload = {
    addressStreet: '  Main Street 1 ',
    addressCity: ' Prague ',
    addressZip: '11000',
    addressCountry: 'cz',
    bankAccount: ' 123456789/0100 ',
    iban: ' cz6508000000192000145399 ',
    bankName: ' My Bank ',
    dic: ' cz12345678 ',
    isVatPayer: true,
    defaultVatRate: 21,
    invoicePrefix: ' inv ',
    invoiceNumberingStart: 5,
    defaultCurrency: ' eur ',
  };

  test('returns 401 when user is not authenticated', async () => {
    mockedGetSessionFromRequest.mockReturnValueOnce(null);

    const response = await PATCH(
      new Request('http://localhost/api/organization', {
        method: 'PATCH',
        body: JSON.stringify(validPayload),
      })
    );

    expect(response.status).toBe(401);
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  test('rejects invalid payload', async () => {
    mockedGetSessionFromRequest.mockReturnValueOnce(session);

    const response = await PATCH(
      new Request('http://localhost/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({ addressStreet: '', addressCity: '', addressZip: '123' }),
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation error');
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  test('normalizes payload before persisting', async () => {
    mockedGetSessionFromRequest.mockReturnValueOnce(session);
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          id: session.organizationId,
          address_street: 'Main Street 1',
        },
      ],
    } as any);

    const response = await PATCH(
      new Request('http://localhost/api/organization', {
        method: 'PATCH',
        body: JSON.stringify(validPayload),
      })
    );

    expect(response.status).toBe(200);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.any(String),
      [
        'Main Street 1',
        'Prague',
        '11000',
        'CZ',
        '123456789/0100',
        'CZ6508000000192000145399',
        'My Bank',
        'CZ12345678',
        true,
        21,
        'INV',
        5,
        'EUR',
        session.organizationId,
      ]
    );
  });
});
