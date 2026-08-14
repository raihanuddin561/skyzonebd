/**
 * @jest-environment node
 */
// __tests__/returns/return-decision.test.ts
// Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 5.
// Verifies PATCH /api/admin/returns/[id]: APPROVED restocks (Product +
// InventoryLog action:'RETURN') and sums refundAmount, no money moves;
// REJECTED just records a reason, no stock/money movement. Refunding is a
// distinct, separate endpoint (see return-refund.test.ts) — mirroring
// Phase 3's maker-checker separation for partner payouts (ADR-016).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  // updateMany is the actual concurrency guard (conditional on
  // status='REQUESTED'); findUniqueOrThrow re-fetches the full record with
  // includes afterward, for the response/email. Defaults to count:1 (guard
  // passes) — a test simulating a lost race overrides with {count:0}.
  return: {
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: jest.fn(),
  },
  product: { findUnique: jest.fn(), update: jest.fn() },
  inventoryLog: { create: jest.fn() },
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const sendReturnStatusUpdate = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendReturnStatusUpdate: (...args: any[]) => sendReturnStatusUpdate(...args) },
}));

import { PATCH } from '@/app/api/admin/returns/[id]/route';

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) { this.headers = new Map(Object.entries(init || {})); }
  get(name: string): string | null { return this.headers.get(name.toLowerCase()) || null; }
}

class MockNextRequest {
  public headers: MockHeaders;
  private body: any;
  constructor(options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    Object.entries(options?.headers || {}).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.body = options?.body;
  }
  async json() { return this.body; }
}

function tokenFor(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockAdmin(id: string) {
  mockPrismaClient.user.findUnique.mockResolvedValueOnce({
    id, email: `${id}@example.com`, name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
}

function req(adminId: string, body: any) {
  return new MockNextRequest({ headers: { Authorization: `Bearer ${tokenFor(adminId)}` }, body }) as any;
}

const params = (id: string) => Promise.resolve({ id });

const existingReturn = (overrides: any = {}) => ({
  id: 'ret-1',
  returnNumber: 'RET-000001',
  status: 'REQUESTED',
  items: [
    { id: 'ri-1', quantity: 2, refundAmount: 200, orderItem: { productId: 'p1', quantity: 5 } },
  ],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.$transaction.mockImplementation((cb: any) => cb(mockPrismaClient));
  mockPrismaClient.return.updateMany.mockResolvedValue({ count: 1 });
});

it('rejects an unauthenticated request (401)', async () => {
  const request = new MockNextRequest({ body: { status: 'APPROVED' } }) as any;
  const res = await PATCH(request, { params: params('ret-1') });
  expect(res.status).toBe(401);
});

it('rejects an invalid status value (400)', async () => {
  mockAdmin('admin-1');
  const res = await PATCH(req('admin-1', { status: 'REFUNDED' }), { params: params('ret-1') });
  expect(res.status).toBe(400);
});

it('rejects rejecting without a rejectionReason (400)', async () => {
  mockAdmin('admin-1');
  const res = await PATCH(req('admin-1', { status: 'REJECTED' }), { params: params('ret-1') });
  expect(res.status).toBe(400);
});

it('rejects deciding a return that is not REQUESTED (400)', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn({ status: 'APPROVED' }));
  const res = await PATCH(req('admin-1', { status: 'APPROVED' }), { params: params('ret-1') });
  expect(res.status).toBe(400);
});

describe('APPROVED', () => {
  it('restocks each line, logs InventoryLog action RETURN, and sums refundAmount — no money moves', async () => {
    mockAdmin('admin-1');
    mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
    mockPrismaClient.product.findUnique.mockResolvedValueOnce({ stockQuantity: 10 });
    mockPrismaClient.return.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'ret-1', returnNumber: 'RET-000001', status: 'APPROVED', refundAmount: 200,
      user: { email: 'c@example.com' },
    });

    const res = await PATCH(req('admin-1', { status: 'APPROVED' }), { params: params('ret-1') });
    expect(res.status).toBe(200);

    expect(mockPrismaClient.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stockQuantity: 12 }, // 10 + 2
    });
    expect(mockPrismaClient.inventoryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: 'p1', action: 'RETURN', quantity: 2, previousStock: 10, newStock: 12 }),
      })
    );
    // The status transition is the conditional updateMany guard (WHERE
    // status='REQUESTED') — a plain update() would let two concurrent
    // APPROVE calls both pass and both restock the same quantity twice.
    expect(mockPrismaClient.return.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ret-1', status: 'REQUESTED' },
        data: expect.objectContaining({ status: 'APPROVED', decidedBy: 'admin-1', refundAmount: 200 }),
      })
    );
    // No Payment or ledger call from this route at all.
    expect(mockPrismaClient.payment).toBeUndefined();
  });

  it('sends a best-effort APPROVED notification email', async () => {
    mockAdmin('admin-1');
    mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
    mockPrismaClient.product.findUnique.mockResolvedValueOnce({ stockQuantity: 10 });
    mockPrismaClient.return.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'ret-1', returnNumber: 'RET-000001', status: 'APPROVED', refundAmount: 200,
      user: { email: 'c@example.com' },
    });

    await PATCH(req('admin-1', { status: 'APPROVED' }), { params: params('ret-1') });
    expect(sendReturnStatusUpdate).toHaveBeenCalledWith('c@example.com', 'RET-000001', 'APPROVED', {});
  });

  it('returns 409 instead of double-restocking when a concurrent request already decided this return', async () => {
    mockAdmin('admin-1');
    mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
    mockPrismaClient.return.updateMany.mockResolvedValueOnce({ count: 0 });

    const res = await PATCH(req('admin-1', { status: 'APPROVED' }), { params: params('ret-1') });

    expect(res.status).toBe(409);
    expect(mockPrismaClient.product.update).not.toHaveBeenCalled();
    expect(mockPrismaClient.inventoryLog.create).not.toHaveBeenCalled();
  });
});

describe('REJECTED', () => {
  it('records the rejection reason with no stock or money movement', async () => {
    mockAdmin('admin-1');
    mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
    mockPrismaClient.return.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'ret-1', returnNumber: 'RET-000001', status: 'REJECTED', rejectionReason: 'Item shows signs of use',
      user: { email: 'c@example.com' },
    });

    const res = await PATCH(req('admin-1', { status: 'REJECTED', rejectionReason: 'Item shows signs of use' }), { params: params('ret-1') });
    expect(res.status).toBe(200);

    expect(mockPrismaClient.return.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ret-1', status: 'REQUESTED' },
        data: expect.objectContaining({ status: 'REJECTED', rejectionReason: 'Item shows signs of use', decidedBy: 'admin-1' }),
      })
    );
    expect(mockPrismaClient.product.update).not.toHaveBeenCalled();
    expect(mockPrismaClient.inventoryLog.create).not.toHaveBeenCalled();
  });

  it('returns 409 instead of double-rejecting when a concurrent request already decided this return', async () => {
    mockAdmin('admin-1');
    mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
    mockPrismaClient.return.updateMany.mockResolvedValueOnce({ count: 0 });

    const res = await PATCH(req('admin-1', { status: 'REJECTED', rejectionReason: 'Item shows signs of use' }), { params: params('ret-1') });

    expect(res.status).toBe(409);
  });
});
