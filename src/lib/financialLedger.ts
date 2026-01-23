/**
 * Financial Ledger Helper
 * Utilities for creating and querying financial ledger entries
 * Following double-entry bookkeeping principles
 */

import { prisma } from '@/lib/prisma';
import { LedgerDirection, LedgerSourceType } from '@prisma/client';

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
export async function createLedgerEntry(params: CreateLedgerEntryParams) {
  const now = new Date();
  
  return prisma.financialLedger.create({
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
  const entries = [];
  
  // Calculate total COGS
  const totalCOGS = order.orderItems.reduce(
    (sum, item) => sum + ((item.costPerUnit || 0) * item.quantity),
    0
  );
  
  // Entry 1: Revenue (Credit)
  const revenueEntry = await createLedgerEntry({
    sourceType: 'ORDER',
    sourceId: order.id,
    sourceName: order.orderNumber,
    amount: order.total,
    direction: 'CREDIT',
    category: 'REVENUE',
    subcategory: 'ORDER_REVENUE',
    partyId: order.userId || undefined,
    partyName: order.guestName || undefined,
    partyType: order.userId ? 'CUSTOMER' : 'GUEST',
    description: `Revenue from order ${order.orderNumber}`,
    orderId: order.id,
  });
  
  entries.push(revenueEntry);
  
  // Entry 2: Cost of Goods Sold (Debit)
  if (totalCOGS > 0) {
    const cogsEntry = await createLedgerEntry({
      sourceType: 'ORDER',
      sourceId: order.id,
      sourceName: order.orderNumber,
      amount: totalCOGS,
      direction: 'DEBIT',
      category: 'COGS',
      subcategory: 'ORDER_COGS',
      description: `Cost of goods for order ${order.orderNumber}`,
      orderId: order.id,
    });
    
    entries.push(cogsEntry);
  }
  
  return entries;
}

/**
 * Create ledger entry for operational cost
 */
export async function createOperationalCostEntry(cost: {
  id: string;
  category: string;
  amount: number;
  description?: string | null;
}) {
  return createLedgerEntry({
    sourceType: 'EXPENSE',
    sourceId: cost.id,
    amount: cost.amount,
    direction: 'DEBIT',
    category: 'OPERATING_EXPENSE',
    subcategory: cost.category,
    description: cost.description || `Operational cost: ${cost.category}`,
  });
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
}) {
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
  });
}

/**
 * Create ledger entry for partner commission
 */
export async function createCommissionEntry(distribution: {
  id: string;
  partnerId: string;
  partnerName?: string;
  distributionAmount: number;
}) {
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
  });
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
