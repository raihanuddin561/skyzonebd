/**
 * @jest-environment node
 */
// __tests__/lib/financialLedger-capital.test.ts
//
// Amazon-style gap-closure Phase 3 part 3: createCapitalEntry posts real
// FinancialLedger entries for partner capital contributions/withdrawals,
// finally using the previously-100%-unused LedgerSourceType.INVESTMENT/
// WITHDRAWAL enum values.

const mockPrismaClient: any = {
  financialLedger: { create: jest.fn().mockImplementation(async ({ data }: any) => data) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { createCapitalEntry } from '@/lib/financialLedger';

beforeEach(() => {
  jest.clearAllMocks();
});

it('posts a CREDIT entry with sourceType INVESTMENT for a contribution', async () => {
  const entry = await createCapitalEntry({
    partnerId: 'p1', partnerName: 'Acme Partner', amount: 5000, direction: 'INVESTMENT',
  });

  expect(entry.sourceType).toBe('INVESTMENT');
  expect(entry.direction).toBe('CREDIT');
  expect(entry.amount).toBe(5000);
  expect(entry.partyId).toBe('p1');
});

it('posts a DEBIT entry with sourceType WITHDRAWAL for a withdrawal', async () => {
  const entry = await createCapitalEntry({
    partnerId: 'p1', partnerName: 'Acme Partner', amount: 2000, direction: 'WITHDRAWAL',
  });

  expect(entry.sourceType).toBe('WITHDRAWAL');
  expect(entry.direction).toBe('DEBIT');
  expect(entry.amount).toBe(2000);
});
