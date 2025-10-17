/** @jest-environment node */

import type { SessionData } from '@/lib/auth';
import { GET } from '@/app/api/invoices/route';
import { getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

jest.mock('@/lib/auth', () => ({
  getSessionFromRequest: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

const mockedGetSession = getSessionFromRequest as jest.MockedFunction<typeof getSessionFromRequest>;
const mockedQuery = query as jest.MockedFunction<typeof query>;

const baseSession: SessionData = {
  userId: 10,
  organizationId: 55,
  role: 'admin',
  email: 'test@example.com',
  exp: 0,
  iat: 0,
};

beforeEach(() => {
  mockedGetSession.mockReset();
  mockedQuery.mockReset();
});

describe('/api/invoices GET', () => {
  test('rejects unauthorized requests', async () => {
    mockedGetSession.mockReturnValueOnce(null);
    const response = await GET(new Request('http://localhost/api/invoices'));
    expect(response.status).toBe(401);
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  test('queries invoices scoped by organization with pagination', async () => {
    mockedGetSession.mockReturnValueOnce(baseSession);
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            invoice_number: '2025-00001',
            variable_symbol: '202500001',
            status: 'paid',
            issue_date: '2025-10-16',
            due_date: '2025-10-30',
            total: '1200.00',
            currency: 'CZK',
            created_at: '2025-10-16',
            sent_at: null,
            paid_at: null,
            client_id: 4,
            client_name: 'Client Test',
          },
        ],
      } as any);

    const response = await GET(
      new Request('http://localhost/api/invoices?limit=3&status=paid&search=2025&sortOrder=asc')
    );

    expect(response.status).toBe(200);
    expect(mockedQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT COUNT(*)'),
      [55, 'paid', '%2025%']
    );
    expect(mockedQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT $'),
      expect.arrayContaining([55, 'paid', '%2025%', 3, 0])
    );
    const body = await response.json();
    expect(body.pagination).toMatchObject({ page: 1, limit: 3, total: 1, pages: 1 });
    expect(body.invoices[0].invoice_number).toBe('2025-00001');
  });
});
