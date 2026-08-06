/**
 * @jest-environment node
 */
// __tests__/utils/financial-ledger-transaction.test.ts
// Verifies part of P1-2: createOrderLedgerEntries posts its revenue (CREDIT)
// and COGS (DEBIT) entries inside one $transaction. Previously these were
// two independent `create` calls — a failure on the second could leave an
// unbalanced ledger (a revenue entry posted with no offsetting COGS debit).

const mockPrismaClient = {
  $transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { prisma } from '@/lib/prisma';
import { createOrderLedgerEntries } from '@/lib/financialLedger';

beforeEach(() => {
  jest.clearAllMocks();
});

it('posts both the revenue and COGS entries inside exactly one $transaction call', async () => {
  const create = jest.fn()
    .mockResolvedValueOnce({ id: 'ledger-1', direction: 'CREDIT' })
    .mockResolvedValueOnce({ id: 'ledger-2', direction: 'DEBIT' });

  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb({ financialLedger: { create } })
  );

  const entries = await createOrderLedgerEntries({
    id: 'order-1',
    orderNumber: 'ORD-1',
    total: 1000,
    userId: 'user-1',
    orderItems: [{ quantity: 2, costPerUnit: 300 }],
  });

  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledTimes(2);
  expect(entries).toHaveLength(2);
});

it('a forced failure on the COGS entry means the revenue entry never commits either (one transaction, not two)', async () => {
  const create = jest.fn()
    .mockResolvedValueOnce({ id: 'ledger-1', direction: 'CREDIT' })
    .mockRejectedValueOnce(new Error('simulated DB failure on COGS entry'));

  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb({ financialLedger: { create } })
  );

  await expect(
    createOrderLedgerEntries({
      id: 'order-1',
      orderNumber: 'ORD-1',
      total: 1000,
      userId: 'user-1',
      orderItems: [{ quantity: 2, costPerUnit: 300 }],
    })
  ).rejects.toThrow('simulated DB failure on COGS entry');

  // Both attempted inside the SAME transaction call — a real Prisma
  // transaction rolls back the already-"created" revenue entry too, since
  // the callback as a whole threw.
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});

it('skips the COGS entry (only posts revenue) when there is no cost basis, without needing a second transaction', async () => {
  const create = jest.fn().mockResolvedValueOnce({ id: 'ledger-1', direction: 'CREDIT' });
  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb({ financialLedger: { create } })
  );

  const entries = await createOrderLedgerEntries({
    id: 'order-2',
    orderNumber: 'ORD-2',
    total: 500,
    orderItems: [{ quantity: 1, costPerUnit: 0 }],
  });

  expect(create).toHaveBeenCalledTimes(1);
  expect(entries).toHaveLength(1);
});
