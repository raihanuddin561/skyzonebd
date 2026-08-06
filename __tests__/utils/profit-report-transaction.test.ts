/**
 * @jest-environment node
 */
// __tests__/utils/profit-report-transaction.test.ts
// Verifies the rest of P1-2: ProfitReport creation and the Order profit-field
// update now happen inside one $transaction, and a ledger-posting failure is
// surfaced in the return value (`ledgerPosted: false`) rather than only
// logged to the console and silently ignored by every caller.

const mockPrismaClient = {
  profitReport: { findFirst: jest.fn() },
  order: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const mockCreateOrderLedgerEntries = jest.fn();
jest.mock('@/lib/financialLedger', () => ({
  createOrderLedgerEntries: (...args: any[]) => mockCreateOrderLedgerEntries(...args),
}));

import { prisma } from '@/lib/prisma';
import { autoGenerateProfitReport } from '@/utils/profitReportGeneration';

function deliveredOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    status: 'DELIVERED',
    userId: 'user-1',
    guestName: null,
    orderItems: [
      {
        total: 1000,
        quantity: 2,
        costPerUnit: 300,
        totalProfit: 400,
        product: {
          id: 'p1', name: 'Product 1', costPerUnit: 300, basePrice: 250,
          platformProfitPercentage: 15, sellerCommissionPercentage: 10, sellerId: null,
        },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('is idempotent — refuses to run if a report already exists for the order', async () => {
  (prisma.profitReport.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'existing-report' });
  const result = await autoGenerateProfitReport('order-1');
  expect(result.success).toBe(false);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

it('creates the ProfitReport and updates the Order inside one $transaction call', async () => {
  (prisma.profitReport.findFirst as jest.Mock).mockResolvedValueOnce(null);
  (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(deliveredOrder());

  const reportCreate = jest.fn().mockResolvedValue({ id: 'report-1' });
  const orderUpdate = jest.fn().mockResolvedValue({});
  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb({ profitReport: { create: reportCreate }, order: { update: orderUpdate } })
  );
  mockCreateOrderLedgerEntries.mockResolvedValueOnce([{}, {}]);

  const result = await autoGenerateProfitReport('order-1');

  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  expect(reportCreate).toHaveBeenCalledTimes(1);
  expect(orderUpdate).toHaveBeenCalledTimes(1);
  expect(result.success).toBe(true);
  expect(result.ledgerPosted).toBe(true);
});

it('a forced failure on the order update rolls back the report creation too (one transaction, not two)', async () => {
  (prisma.profitReport.findFirst as jest.Mock).mockResolvedValueOnce(null);
  (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(deliveredOrder());

  const reportCreate = jest.fn().mockResolvedValue({ id: 'report-1' });
  const orderUpdate = jest.fn().mockRejectedValue(new Error('simulated order-update failure'));
  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb({ profitReport: { create: reportCreate }, order: { update: orderUpdate } })
  );

  const result = await autoGenerateProfitReport('order-1');

  expect(result.success).toBe(false);
  expect(mockCreateOrderLedgerEntries).not.toHaveBeenCalled();
});

it('reports the report+order transaction as successful even if ledger posting subsequently fails, but flags ledgerPosted:false', async () => {
  (prisma.profitReport.findFirst as jest.Mock).mockResolvedValueOnce(null);
  (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(deliveredOrder());

  const reportCreate = jest.fn().mockResolvedValue({ id: 'report-1' });
  const orderUpdate = jest.fn().mockResolvedValue({});
  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb({ profitReport: { create: reportCreate }, order: { update: orderUpdate } })
  );
  mockCreateOrderLedgerEntries.mockRejectedValueOnce(new Error('simulated ledger failure'));

  const result = await autoGenerateProfitReport('order-1');

  // The profit report itself is a committed fact — not silently rolled
  // back for a ledger-side hiccup — but the gap is now visible, not
  // swallowed in a bare console.error with no return-value trace.
  expect(result.success).toBe(true);
  expect(result.reportId).toBe('report-1');
  expect(result.ledgerPosted).toBe(false);
  expect(result.message).toMatch(/ledger posting FAILED/i);
});
