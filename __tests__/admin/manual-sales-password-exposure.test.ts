/**
 * @jest-environment node
 */
// __tests__/admin/manual-sales-password-exposure.test.ts
// Verifies a P0-8 finding discovered during the password-hash audit:
// PUT /api/admin/manual-sales/[id] included `customer: true` (the full
// User relation, including the bcrypt password hash) in its response,
// while the sibling GET handler and the `enteredByUser` relation in the
// same query already used a safe, explicit `select`.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  manualSalesEntry: { findUnique: jest.fn(), update: jest.fn() },
};

// src/lib/db.ts was consolidated into src/lib/prisma.ts — P1-4.
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  getJwtSecret: () => JWT_SECRET,
}));
jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/lib/prisma';
import { PUT } from '@/app/api/admin/manual-sales/[id]/route';

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) {
    this.headers = new Map(Object.entries(init || {}));
  }
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

class MockNextRequest {
  public headers: MockHeaders;
  private body: any;
  constructor(init?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    Object.entries(init?.headers || {}).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.body = init?.body;
  }
  async json() {
    return this.body;
  }
}

const params = Promise.resolve({ id: 'entry-1' });

beforeEach(() => {
  jest.clearAllMocks();
});

it('the PUT query requests a safe, explicit select for `customer` — not the full relation', async () => {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  (mockPrismaClient.manualSalesEntry.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'entry-1' });
  (mockPrismaClient.manualSalesEntry.update as jest.Mock).mockResolvedValueOnce({
    id: 'entry-1',
    referenceNumber: 'REF-1',
    saleDate: new Date(),
    customer: { id: 'cust-1', name: 'Customer', email: 'c@example.com', phone: '123', companyName: null },
    enteredByUser: { id: 'admin-1', name: 'Admin', email: 'admin@example.com' },
  });

  const request = new MockNextRequest({
    headers: { Authorization: `Bearer ${token}` },
    body: { notes: 'updated' },
  }) as any;

  const res = await PUT(request, { params });
  expect(res.status).toBe(200);

  const updateCall = (mockPrismaClient.manualSalesEntry.update as jest.Mock).mock.calls[0][0];
  const customerInclude = updateCall.include.customer;
  // Must be a scoped `{ select: {...} }` object, not the literal `true`
  // (which would pull every User column, including `password`).
  expect(customerInclude).not.toBe(true);
  expect(customerInclude.select).toBeDefined();
  expect(customerInclude.select.password).toBeUndefined();

  const body = await res.json();
  expect(body.data.customer).not.toHaveProperty('password');
});
