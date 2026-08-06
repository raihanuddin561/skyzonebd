/**
 * @jest-environment node
 */
// __tests__/services/invoiceService.test.ts
//
// Amazon-style gap-closure Phase 2 part 3: real invoicing + accounts
// receivable for NET30/60/90 orders.

const mockPrismaClient: any = {
  businessInfo: { findUnique: jest.fn() },
  invoice: { findMany: jest.fn(), create: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { getPaymentTermsForMethod, checkCreditLimit, createInvoiceForOrder } from '@/services/invoiceService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getPaymentTermsForMethod', () => {
  it('maps INVOICE_NET30/60/90 to their PaymentTermsType', () => {
    expect(getPaymentTermsForMethod('INVOICE_NET30')).toBe('NET30');
    expect(getPaymentTermsForMethod('INVOICE_NET60')).toBe('NET60');
    expect(getPaymentTermsForMethod('INVOICE_NET90')).toBe('NET90');
  });

  it('returns null for every non-invoice payment method', () => {
    expect(getPaymentTermsForMethod('bkash')).toBeNull();
    expect(getPaymentTermsForMethod('cash_on_delivery')).toBeNull();
    expect(getPaymentTermsForMethod('BANK_TRANSFER')).toBeNull();
  });
});

describe('checkCreditLimit', () => {
  it('allows the order when no creditLimit is configured (unlimited by default)', async () => {
    mockPrismaClient.businessInfo.findUnique.mockResolvedValue({ creditLimit: null });
    mockPrismaClient.invoice.findMany.mockResolvedValue([]);

    const result = await checkCreditLimit('cust-1', 5000);

    expect(result.allowed).toBe(true);
    expect(result.creditLimit).toBeNull();
  });

  it('allows an order that keeps the outstanding balance within the limit', async () => {
    mockPrismaClient.businessInfo.findUnique.mockResolvedValue({ creditLimit: 10000 });
    mockPrismaClient.invoice.findMany.mockResolvedValue([
      { amount: 3000, paidAmount: 1000 }, // 2000 outstanding
    ]);

    const result = await checkCreditLimit('cust-1', 5000);

    expect(result.outstandingBalance).toBe(2000);
    expect(result.wouldBeBalance).toBe(7000);
    expect(result.allowed).toBe(true);
  });

  it('rejects an order that would push the outstanding balance over the limit', async () => {
    mockPrismaClient.businessInfo.findUnique.mockResolvedValue({ creditLimit: 10000 });
    mockPrismaClient.invoice.findMany.mockResolvedValue([
      { amount: 8000, paidAmount: 0 },
    ]);

    const result = await checkCreditLimit('cust-1', 5000);

    expect(result.wouldBeBalance).toBe(13000);
    expect(result.allowed).toBe(false);
  });

  it('only counts UNPAID/PARTIALLY_PAID/OVERDUE invoices as outstanding', async () => {
    mockPrismaClient.businessInfo.findUnique.mockResolvedValue({ creditLimit: 10000 });
    mockPrismaClient.invoice.findMany.mockResolvedValue([]);

    await checkCreditLimit('cust-1', 1000);

    const whereArg = mockPrismaClient.invoice.findMany.mock.calls[0][0].where;
    expect(whereArg.status.in).toEqual(['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']);
  });
});

describe('createInvoiceForOrder', () => {
  it('creates an UNPAID invoice with a due date N days out based on the term', async () => {
    mockPrismaClient.invoice.create.mockImplementation(async ({ data }: any) => data);

    const invoice = await createInvoiceForOrder({
      orderId: 'order-1', customerId: 'cust-1', amount: 5000, paymentTerms: 'NET30',
    });

    expect(invoice.status).toBe('UNPAID');
    expect(invoice.amount).toBe(5000);
    expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
    const daysDiff = Math.round((invoice.dueDate.getTime() - invoice.issueDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(30);
  });

  it('uses 60/90 days for NET60/NET90', async () => {
    mockPrismaClient.invoice.create.mockImplementation(async ({ data }: any) => data);

    const inv60 = await createInvoiceForOrder({ orderId: 'o2', customerId: 'c1', amount: 100, paymentTerms: 'NET60' });
    const inv90 = await createInvoiceForOrder({ orderId: 'o3', customerId: 'c1', amount: 100, paymentTerms: 'NET90' });

    expect(Math.round((inv60.dueDate.getTime() - inv60.issueDate.getTime()) / 86400000)).toBe(60);
    expect(Math.round((inv90.dueDate.getTime() - inv90.issueDate.getTime()) / 86400000)).toBe(90);
  });
});
