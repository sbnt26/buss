/** @jest-environment node */

import type { SessionData } from '@/lib/auth';
import { GET, POST } from '@/app/api/clients/route';
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

const createSession = (overrides: Partial<SessionData> = {}): SessionData => ({
  userId: 1,
  organizationId: 42,
  role: 'admin',
  email: 'user@example.com',
  exp: 0,
  iat: 0,
  ...overrides,
});

beforeEach(() => {
  mockedGetSessionFromRequest.mockReset();
  mockedQuery.mockReset();
});

describe('/api/clients route', () => {
  test('GET requires authentication', async () => {
    mockedGetSessionFromRequest.mockReturnValueOnce(null);

    const response = await GET(new Request('http://localhost/api/clients'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  test('GET returns clients scoped to organization', async () => {
    mockedGetSessionFromRequest.mockReturnValueOnce(createSession({ organizationId: 7 }));
    const fakeRows = [
      { id: 1, name: 'Client A' },
      { id: 2, name: 'Client B' },
    ];
    mockedQuery.mockResolvedValueOnce({ rows: fakeRows } as any);

    const response = await GET(new Request('http://localhost/api/clients'));

    expect(response.status).toBe(200);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE organization_id = $1'),
      [7]
    );
    const body = await response.json();
    expect(body).toEqual({ clients: fakeRows });
  });

  test('POST requires authentication', async () => {
    mockedGetSessionFromRequest.mockReturnValueOnce(null);

    const response = await POST(
      new Request('http://localhost/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'ACME' }),
      })
    );

    expect(response.status).toBe(401);
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  test('POST stores client for current organization', async () => {
    mockedGetSessionFromRequest.mockReturnValueOnce(createSession({ organizationId: 99 }));
    const inserted = {
      id: 10,
      name: 'New Client',
      address_street: 'Main 1',
    };
    mockedQuery.mockResolvedValueOnce({ rows: [inserted] } as any);

    const payload = {
      name: 'New Client',
      email: 'client@example.com',
      ic: '12345678',
      street: ' Main 1 ',
      city: ' Prague ',
      postal_code: '11000',
      country: 'cz',
    };

    const response = await POST(
      new Request('http://localhost/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(201);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([99, payload.name])
    );
    const body = await response.json();
    expect(body).toEqual(inserted);
  });
});
