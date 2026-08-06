/**
 * @jest-environment node
 */
// __tests__/admin/costs-ledger-entry.test.ts
//
// Amazon-style gap-closure Phase 2 part 1: POST /api/admin/costs used to
// create an OperationalCost row with zero trace in FinancialLedger —
// createOperationalCostEntry existed but was dead code. Now a PAID/PARTIAL
// cost posts a DEBIT ledger entry inside the same transaction; a PENDING
// cost (not yet an actual expense) does not.

const mockPrismaClient: any = {
  operationalCost: { create: jest.fn() },
  financialLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/middleware/permissionMiddleware', () => ({
  checkPermission: jest.fn().mockResolvedValue({ authorized: true, userId: 'admin-1' }),
}));

import { POST } from '@/app/api/admin/costs/route';

function req(body: any) {
  return { json: async () => body } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.$transaction.mockImplementation((cb: any) => cb(mockPrismaClient));
});

it('posts a DEBIT ledger entry when a cost is created as PAID', async () => {
  mockPrismaClient.operationalCost.create.mockResolvedValue({
    id: 'cost-1', category: 'UTILITIES', amount: 500, description: 'Electricity bill',
  });

  const res = await POST(req({ category: 'UTILITIES', amount: 500, description: 'Electricity bill', paymentStatus: 'PAID' }));

  expect(res!.status).toBe(201);
  expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledTimes(1);
  const entry = mockPrismaClient.financialLedger.create.mock.calls[0][0].data;
  expect(entry.sourceType).toBe('EXPENSE');
  expect(entry.direction).toBe('DEBIT');
  expect(entry.amount).toBe(500);
  expect(entry.sourceId).toBe('cost-1');
});

it('posts a DEBIT ledger entry when a cost is created as PARTIAL', async () => {
  mockPrismaClient.operationalCost.create.mockResolvedValue({
    id: 'cost-2', category: 'RENT', amount: 1000, description: 'Office rent',
  });

  await POST(req({ category: 'RENT', amount: 1000, description: 'Office rent', paymentStatus: 'PARTIAL' }));

  expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledTimes(1);
});

it('does not post a ledger entry for a PENDING cost', async () => {
  mockPrismaClient.operationalCost.create.mockResolvedValue({
    id: 'cost-3', category: 'MARKETING', amount: 300, description: 'Ad campaign',
  });

  const res = await POST(req({ category: 'MARKETING', amount: 300, description: 'Ad campaign', paymentStatus: 'PENDING' }));

  expect(res!.status).toBe(201);
  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
});

it('defaults to PENDING (no ledger entry) when paymentStatus is omitted', async () => {
  mockPrismaClient.operationalCost.create.mockResolvedValue({
    id: 'cost-4', category: 'OTHER', amount: 200, description: null,
  });

  await POST(req({ category: 'OTHER', amount: 200 }));

  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
});
