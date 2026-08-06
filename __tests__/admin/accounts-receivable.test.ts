/**
 * @jest-environment node
 */
// __tests__/admin/accounts-receivable.test.ts
//
// Amazon-style gap-closure Phase 2 part 3: GET /api/admin/financial/
// accounts-receivable mirrors outstanding-payouts/route.ts's aging
// pattern for customer invoices instead of partner distributions.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  invoice: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { GET } from '@/app/api/admin/financial/accounts-receivable/route';

function req(qs = '') {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    nextUrl: new URL(`http://localhost/api/admin/financial/accounts-receivable${qs}`),
  } as any;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
});

it('flags an invoice as overdue only when its due date has passed and it is not fully paid', async () => {
  mockPrismaClient.invoice.findMany.mockResolvedValue([
    {
      id: 'inv-1', invoiceNumber: 'INV-1', orderId: 'o1', customerId: 'c1', amount: 1000, paidAmount: 0,
      status: 'UNPAID', dueDate: daysAgo(5), notes: null,
      customer: { id: 'c1', name: 'Acme', email: 'a@x.com', phone: null },
      order: { orderNumber: 'ORD-1' },
    },
    {
      id: 'inv-2', invoiceNumber: 'INV-2', orderId: 'o2', customerId: 'c2', amount: 500, paidAmount: 0,
      status: 'UNPAID', dueDate: daysFromNow(10), notes: null,
      customer: { id: 'c2', name: 'Beta', email: 'b@x.com', phone: null },
      order: { orderNumber: 'ORD-2' },
    },
  ]);

  const res = await GET(req());
  const body = await res.json();

  const inv1 = body.data.invoices.find((i: any) => i.invoiceNumber === 'INV-1');
  const inv2 = body.data.invoices.find((i: any) => i.invoiceNumber === 'INV-2');
  expect(inv1.isOverdue).toBe(true);
  expect(inv2.isOverdue).toBe(false);
});

it('aggregates outstanding balance by customer', async () => {
  mockPrismaClient.invoice.findMany.mockResolvedValue([
    {
      id: 'inv-1', invoiceNumber: 'INV-1', orderId: 'o1', customerId: 'c1', amount: 1000, paidAmount: 200,
      status: 'PARTIALLY_PAID', dueDate: daysFromNow(5), notes: null,
      customer: { id: 'c1', name: 'Acme', email: 'a@x.com', phone: null },
      order: { orderNumber: 'ORD-1' },
    },
    {
      id: 'inv-2', invoiceNumber: 'INV-2', orderId: 'o2', customerId: 'c1', amount: 300, paidAmount: 0,
      status: 'UNPAID', dueDate: daysFromNow(20), notes: null,
      customer: { id: 'c1', name: 'Acme', email: 'a@x.com', phone: null },
      order: { orderNumber: 'ORD-2' },
    },
  ]);

  const res = await GET(req());
  const body = await res.json();

  expect(body.data.byCustomer).toHaveLength(1);
  expect(body.data.byCustomer[0].totalOutstanding).toBe(1100); // (1000-200) + (300-0)
  expect(body.data.byCustomer[0].count).toBe(2);
});

it('filters to only overdue invoices when overdue=true', async () => {
  mockPrismaClient.invoice.findMany.mockResolvedValue([
    {
      id: 'inv-1', invoiceNumber: 'INV-1', orderId: 'o1', customerId: 'c1', amount: 1000, paidAmount: 0,
      status: 'UNPAID', dueDate: daysAgo(5), notes: null,
      customer: { id: 'c1', name: 'Acme', email: 'a@x.com', phone: null },
      order: { orderNumber: 'ORD-1' },
    },
    {
      id: 'inv-2', invoiceNumber: 'INV-2', orderId: 'o2', customerId: 'c2', amount: 500, paidAmount: 0,
      status: 'UNPAID', dueDate: daysFromNow(10), notes: null,
      customer: { id: 'c2', name: 'Beta', email: 'b@x.com', phone: null },
      order: { orderNumber: 'ORD-2' },
    },
  ]);

  const res = await GET(req('?overdue=true'));
  const body = await res.json();

  expect(body.data.invoices).toHaveLength(1);
  expect(body.data.invoices[0].invoiceNumber).toBe('INV-1');
});
