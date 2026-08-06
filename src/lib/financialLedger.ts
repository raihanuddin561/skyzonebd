/**
 * Financial Ledger Helper
 * Utilities for creating and querying financial ledger entries
 * Following double-entry bookkeeping principles
 */

import { prisma } from '@/lib/prisma';
import { LedgerDirection, LedgerSourceType, Prisma } from '@prisma/client';

type LedgerClient = Prisma.TransactionClient | typeof prisma;

export interface CreateLedgerEntryParams {
  sourceType: LedgerSourceType;
  sourceId: string;
  sourceName?: string;
  amount: number;
  direction: LedgerDirection;
  category?: string;
  subcategory?: string;
  partyId?: string;
  partyName?: string;
  partyType?: string;
  description?: string;
  notes?: string;
  metadata?: any;
  createdBy?: string;
  orderId?: string;
}

/**
 * Create a single financial ledger entry
 * Always use positive amounts - direction determines debit/credit
 */
export async function createLedgerEntry(params: CreateLedgerEntryParams, client: LedgerClient = prisma) {
  const now = new Date();

  return client.financialLedger.create({
    data: {
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      sourceName: params.sourceName,
      amount: Math.abs(params.amount), // Always positive
      direction: params.direction,
      category: params.category,
      subcategory: params.subcategory,
      partyId: params.partyId,
      partyName: params.partyName,
      partyType: params.partyType,
      description: params.description,
      notes: params.notes,
      metadata: params.metadata,
      createdBy: params.createdBy,
      fiscalYear: now.getFullYear(),
      fiscalMonth: now.getMonth() + 1,
      orderId: params.orderId,
    },
  });
}

/**
 * Create double-entry ledger entries for an order
 * Creates both revenue (credit) and COGS (debit) entries
 */
export async function createOrderLedgerEntries(order: {
  id: string;
  orderNumber: string;
  total: number;
  userId?: string | null;
  guestName?: string | null;
  orderItems: Array<{
    quantity: number;
    costPerUnit: number | null;
  }>;
}) {
  // Calculate total COGS
  const totalCOGS = order.orderItems.reduce(
    (sum, item) => sum + ((item.costPerUnit || 0) * item.quantity),
    0
  );

  const now = new Date();

  // Both entries of this double-entry pair are created inside one
  // transaction — previously they were two independent `create` calls, so
  // a failure on the second (COGS) entry could leave the revenue entry
  // posted with no offsetting debit, an unbalanced ledger for a system
  // that's explicitly meant to be double-entry (P1-2).
  return prisma.$transaction(async (tx) => {
    const entries = [];

    const revenueEntry = await tx.financialLedger.create({
      data: {
        sourceType: 'ORDER',
        sourceId: order.id,
        sourceName: order.orderNumber,
        amount: Math.abs(order.total),
        direction: 'CREDIT',
        category: 'REVENUE',
        subcategory: 'ORDER_REVENUE',
        partyId: order.userId || undefined,
        partyName: order.guestName || undefined,
        partyType: order.userId ? 'CUSTOMER' : 'GUEST',
        description: `Revenue from order ${order.orderNumber}`,
        orderId: order.id,
        fiscalYear: now.getFullYear(),
        fiscalMonth: now.getMonth() + 1,
      },
    });
    entries.push(revenueEntry);

    if (totalCOGS > 0) {
      const cogsEntry = await tx.financialLedger.create({
        data: {
          sourceType: 'ORDER',
          sourceId: order.id,
          sourceName: order.orderNumber,
          amount: Math.abs(totalCOGS),
          direction: 'DEBIT',
          category: 'COGS',
          subcategory: 'ORDER_COGS',
          description: `Cost of goods for order ${order.orderNumber}`,
          orderId: order.id,
          fiscalYear: now.getFullYear(),
          fiscalMonth: now.getMonth() + 1,
        },
      });
      entries.push(cogsEntry);
    }

    return entries;
  });
}

/**
 * Create the double-entry reversal pair for a processed return refund
 * (Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 5; see
 * ADR-016). The dead `processRefund()` this replaces only ever posted a
 * single DEBIT/REFUNDS entry — a cash-out log, not an actual reversal — so
 * a refunded order's reported revenue and COGS never shrank to reflect it.
 * This posts both sides: a DEBIT against REVENUE for the cash returned, and
 * a CREDIT against COGS for the returned items' cost (both categories, so
 * getFinancialSummary's revenue/cogs formulas — updated alongside this —
 * net them against the original order's entries).
 */
export async function createRefundReversalEntries(params: {
  returnId: string;
  returnNumber: string;
  orderId: string;
  refundAmount: number;
  returnedCOGS: number;
  partyId?: string;
  partyName?: string;
  createdBy: string;
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const entries = [];

    const revenueReversal = await tx.financialLedger.create({
      data: {
        sourceType: 'REFUND',
        sourceId: params.returnId,
        sourceName: params.returnNumber,
        amount: Math.abs(params.refundAmount),
        direction: 'DEBIT',
        category: 'REVENUE',
        subcategory: 'RETURN_REFUND',
        partyId: params.partyId,
        partyName: params.partyName,
        partyType: params.partyId ? 'CUSTOMER' : 'GUEST',
        description: `Revenue reversal for return ${params.returnNumber}`,
        orderId: params.orderId,
        createdBy: params.createdBy,
        fiscalYear: now.getFullYear(),
        fiscalMonth: now.getMonth() + 1,
      },
    });
    entries.push(revenueReversal);

    if (params.returnedCOGS > 0) {
      const cogsReversal = await tx.financialLedger.create({
        data: {
          sourceType: 'RETURN',
          sourceId: params.returnId,
          sourceName: params.returnNumber,
          amount: Math.abs(params.returnedCOGS),
          direction: 'CREDIT',
          category: 'COGS',
          subcategory: 'RETURN_COGS_REVERSAL',
          description: `Cost-of-goods reversal for return ${params.returnNumber}`,
          orderId: params.orderId,
          createdBy: params.createdBy,
          fiscalYear: now.getFullYear(),
          fiscalMonth: now.getMonth() + 1,
        },
      });
      entries.push(cogsReversal);
    }

    return entries;
  });
}

/**
 * Create ledger entry for operational cost
 */
export async function createOperationalCostEntry(cost: {
  id: string;
  category: string;
  amount: number;
  description?: string | null;
}, client: LedgerClient = prisma) {
  return createLedgerEntry({
    sourceType: 'EXPENSE',
    sourceId: cost.id,
    amount: cost.amount,
    direction: 'DEBIT',
    category: 'OPERATING_EXPENSE',
    subcategory: cost.category,
    description: cost.description || `Operational cost: ${cost.category}`,
  }, client);
}

/**
 * Create ledger entry for salary payment
 */
export async function createSalaryEntry(salary: {
  id: string;
  employeeId: string;
  employeeName?: string;
  netSalary: number;
  month: number;
  year: number;
}, client: LedgerClient = prisma) {
  return createLedgerEntry({
    sourceType: 'SALARY',
    sourceId: salary.id,
    amount: salary.netSalary,
    direction: 'DEBIT',
    category: 'OPERATING_EXPENSE',
    subcategory: 'EMPLOYEE_SALARY',
    partyId: salary.employeeId,
    partyName: salary.employeeName,
    partyType: 'EMPLOYEE',
    description: `Salary payment for ${salary.employeeName || 'employee'} - ${salary.month}/${salary.year}`,
  }, client);
}

/**
 * Create ledger entry for partner commission
 */
export async function createCommissionEntry(distribution: {
  id: string;
  partnerId: string;
  partnerName?: string;
  distributionAmount: number;
}, client: LedgerClient = prisma) {
  return createLedgerEntry({
    sourceType: 'COMMISSION',
    sourceId: distribution.id,
    amount: distribution.distributionAmount,
    direction: 'DEBIT',
    category: 'PARTNER_DISTRIBUTION',
    subcategory: 'COMMISSION_PAYOUT',
    partyId: distribution.partnerId,
    partyName: distribution.partnerName,
    partyType: 'PARTNER',
    description: `Commission payout to ${distribution.partnerName || 'partner'}`,
  }, client);
}

/**
 * Create ledger entry for a partner capital contribution or withdrawal
 * (Amazon-style gap-closure Phase 3 part 3) — an INVESTMENT is money the
 * partner puts into the business (CREDIT — money in); a WITHDRAWAL is
 * money the partner takes out (DEBIT — money out). This is how capital
 * events should be recorded going forward instead of editing
 * Partner.initialInvestment directly, which has no history.
 */
export async function createCapitalEntry(params: {
  partnerId: string;
  partnerName?: string;
  amount: number;
  direction: 'INVESTMENT' | 'WITHDRAWAL';
  notes?: string;
  createdBy?: string;
}, client: LedgerClient = prisma) {
  return createLedgerEntry({
    sourceType: params.direction,
    sourceId: params.partnerId,
    amount: params.amount,
    direction: params.direction === 'INVESTMENT' ? 'CREDIT' : 'DEBIT',
    category: 'PARTNER_CAPITAL',
    subcategory: params.direction,
    partyId: params.partnerId,
    partyName: params.partnerName,
    partyType: 'PARTNER',
    description: `${params.direction === 'INVESTMENT' ? 'Capital contribution from' : 'Capital withdrawal by'} ${params.partnerName || 'partner'}`,
    notes: params.notes,
    createdBy: params.createdBy,
  }, client);
}

/**
 * Create adjustment entry (for corrections)
 */
export async function createAdjustmentEntry(params: {
  originalEntryId: string;
  amount: number;
  direction: LedgerDirection;
  reason: string;
  createdBy: string;
}) {
  return createLedgerEntry({
    sourceType: 'ADJUSTMENT',
    sourceId: params.originalEntryId,
    amount: params.amount,
    direction: params.direction,
    category: 'ADJUSTMENT',
    description: `Adjustment: ${params.reason}`,
    notes: `Correcting entry ${params.originalEntryId}`,
    metadata: { reversedEntryId: params.originalEntryId },
    createdBy: params.createdBy,
  });
}

/**
 * Get ledger entries for a specific order
 */
export async function getOrderLedgerEntries(orderId: string) {
  return prisma.financialLedger.findMany({
    where: {
      orderId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Calculate balance for a period
 */
export async function calculatePeriodBalance(
  startDate: Date,
  endDate: Date
) {
  const entries = await prisma.financialLedger.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  
  const credits = entries
    .filter(e => e.direction === 'CREDIT')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const debits = entries
    .filter(e => e.direction === 'DEBIT')
    .reduce((sum, e) => sum + e.amount, 0);
  
  return {
    totalCredits: credits,
    totalDebits: debits,
    netBalance: credits - debits,
    entries: entries.length,
  };
}

/**
 * Get ledger entries by source type and date range
 */
export async function getLedgerEntriesByType(
  sourceType: LedgerSourceType,
  startDate?: Date,
  endDate?: Date
) {
  const where: any = {
    sourceType,
  };
  
  if (startDate && endDate) {
    where.createdAt = {
      gte: startDate,
      lte: endDate,
    };
  }
  
  return prisma.financialLedger.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Reconcile ledger entries
 */
export async function reconcileLedgerEntries(
  entryIds: string[],
  reconciledBy: string
) {
  return prisma.financialLedger.updateMany({
    where: {
      id: {
        in: entryIds,
      },
    },
    data: {
      isReconciled: true,
      reconciledAt: new Date(),
      reconciledBy,
    },
  });
}

/**
 * Get unreconciled entries
 */
export async function getUnreconciledEntries(limit = 100) {
  return prisma.financialLedger.findMany({
    where: {
      isReconciled: false,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
  });
}

export interface FinancialSummary {
  startDate: Date;
  endDate: Date;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operationalCosts: number;
  operationalCostsByCategory: Record<string, number>;
  salaryExpenses: number;
  /** Profit before any partner-distribution payout is subtracted. */
  netProfitBeforeDistribution: number;
  distributionsPaid: number;
  /** What the platform actually keeps after paying partners their share. */
  platformRetainedProfit: number;
}

/**
 * The single, canonical period profit calculation — derives every figure
 * from FinancialLedger entries rather than re-aggregating Order/Sale/
 * OperationalCost tables independently (Amazon-style gap-closure Phase 2,
 * part 2: "one true ledger"). Revenue/COGS come from ORDER and MANUAL_SALE
 * entries (the only two sourceTypes that post REVENUE/COGS categories);
 * operational costs, salaries, and partner-distribution payouts come from
 * the entries Phase 2 part 1 wired up (createOperationalCostEntry/
 * createSalaryEntry/createCommissionEntry).
 *
 * Partner-distribution payouts are treated as a distribution of profit,
 * not an expense that reduces it — hence netProfitBeforeDistribution is
 * exposed separately from platformRetainedProfit, resolving a pre-existing
 * inconsistency where one endpoint's own `netProfit` and
 * `platformRetainedProfit` fields used two different distribution subsets.
 */
export async function getFinancialSummary(
  startDate: Date,
  endDate: Date,
  client: LedgerClient = prisma
): Promise<FinancialSummary> {
  const entries = await client.financialLedger.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
  });

  const sumWhere = (predicate: (e: (typeof entries)[number]) => boolean) =>
    entries.filter(predicate).reduce((sum, e) => sum + e.amount, 0);

  // Refund reversals (Amazon-Style Wholesale Platform Gap Closure — Phase 4
  // part 5) post to the opposite direction within the same REVENUE/COGS
  // categories rather than a separate "REFUNDS" bucket nobody nets — a
  // DEBIT/REVENUE entry shrinks revenue, a CREDIT/COGS entry shrinks COGS,
  // so a processed refund actually reduces reported revenue/profit for the
  // period instead of only appearing as an unrelated cash-out line.
  const revenue = sumWhere(
    (e) => e.direction === 'CREDIT' && (e.sourceType === 'ORDER' || e.sourceType === 'MANUAL_SALE') && e.category === 'REVENUE'
  ) - sumWhere(
    (e) => e.direction === 'DEBIT' && e.sourceType === 'REFUND' && e.category === 'REVENUE'
  );
  const cogs = sumWhere(
    (e) => e.direction === 'DEBIT' && (e.sourceType === 'ORDER' || e.sourceType === 'MANUAL_SALE') && e.category === 'COGS'
  ) - sumWhere(
    (e) => e.direction === 'CREDIT' && e.sourceType === 'RETURN' && e.category === 'COGS'
  );
  const grossProfit = revenue - cogs;

  const operationalCostEntries = entries.filter((e) => e.direction === 'DEBIT' && e.sourceType === 'EXPENSE');
  const operationalCosts = operationalCostEntries.reduce((sum, e) => sum + e.amount, 0);
  const operationalCostsByCategory = operationalCostEntries.reduce((acc, e) => {
    const key = e.subcategory || 'OTHER';
    acc[key] = (acc[key] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const salaryExpenses = sumWhere((e) => e.direction === 'DEBIT' && e.sourceType === 'SALARY');

  const netProfitBeforeDistribution = grossProfit - operationalCosts - salaryExpenses;

  const distributionsPaid = sumWhere((e) => e.direction === 'DEBIT' && e.sourceType === 'COMMISSION');
  const platformRetainedProfit = netProfitBeforeDistribution - distributionsPaid;

  return {
    startDate,
    endDate,
    revenue,
    cogs,
    grossProfit,
    operationalCosts,
    operationalCostsByCategory,
    salaryExpenses,
    netProfitBeforeDistribution,
    distributionsPaid,
    platformRetainedProfit,
  };
}
