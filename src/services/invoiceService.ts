/**
 * Invoice + accounts-receivable helpers for NET30/60/90 wholesale orders
 * (Amazon-style gap-closure Phase 2 part 3).
 */

import { Prisma, PaymentTermsType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type InvoiceClient = Prisma.TransactionClient | typeof prisma;

const NET_TERMS_DAYS: Record<PaymentTermsType, number> = {
  NET30: 30,
  NET60: 60,
  NET90: 90,
};

const NET_TERMS_BY_PAYMENT_METHOD: Record<string, PaymentTermsType> = {
  INVOICE_NET30: 'NET30',
  INVOICE_NET60: 'NET60',
  INVOICE_NET90: 'NET90',
};

/** Returns the NET terms an order's paymentMethod implies, or null for every other payment method (cash/prepaid — no invoice/AR involved). */
export function getPaymentTermsForMethod(paymentMethod: string): PaymentTermsType | null {
  return NET_TERMS_BY_PAYMENT_METHOD[paymentMethod] ?? null;
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${y}${m}-${random}`;
}

export interface CreditLimitCheckResult {
  allowed: boolean;
  creditLimit: number | null;
  outstandingBalance: number;
  wouldBeBalance: number;
}

/**
 * Sums a customer's outstanding (UNPAID/PARTIALLY_PAID/OVERDUE) invoice
 * balance and checks whether adding `newOrderAmount` would exceed their
 * BusinessInfo.creditLimit. A customer with no BusinessInfo or no
 * creditLimit set is treated as unlimited (allowed: true) — creditLimit
 * is an opt-in ceiling a business sets for itself, not a default-deny
 * gate that blocks every wholesale customer who never configured one.
 */
export async function checkCreditLimit(
  customerId: string,
  newOrderAmount: number,
  client: InvoiceClient = prisma
): Promise<CreditLimitCheckResult> {
  const businessInfo = await client.businessInfo.findUnique({
    where: { userId: customerId },
    select: { creditLimit: true },
  });

  const outstandingInvoices = await client.invoice.findMany({
    where: {
      customerId,
      status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
    },
    select: { amount: true, paidAmount: true },
  });

  const outstandingBalance = outstandingInvoices.reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);
  const wouldBeBalance = outstandingBalance + newOrderAmount;
  const creditLimit = businessInfo?.creditLimit ?? null;

  return {
    allowed: creditLimit === null || wouldBeBalance <= creditLimit,
    creditLimit,
    outstandingBalance,
    wouldBeBalance,
  };
}

export async function createInvoiceForOrder(
  params: { orderId: string; customerId: string; amount: number; paymentTerms: PaymentTermsType },
  client: InvoiceClient = prisma
) {
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + NET_TERMS_DAYS[params.paymentTerms]);

  return client.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      orderId: params.orderId,
      customerId: params.customerId,
      issueDate,
      dueDate,
      paymentTerms: params.paymentTerms,
      amount: params.amount,
      status: 'UNPAID',
    },
  });
}
