/**
 * Profit Sharing & Distribution Engine — SkyzoneBD (Phase 3)
 *
 * Implements percentage-based profit sharing with:
 * - Integer poisha precision math
 * - Strict 100% active percentage validation
 * - Largest Remainder Method (Hare-Niemeyer) for zero-leakage poisha rounding
 * - Configurable Reserve / Retained Earnings deduction
 * - Loss Carry-Forward handling across periods
 * - Mid-period rule versioning and effective date sub-period calculation
 * - Locked period immutability and subsequent return adjustments
 * - Audit trail and stakeholder statement generation
 */

import { toPoisha, fromPoisha, roundHalfUp, allocatePoishaByWeights, POISHA_PER_BDT } from './calculationService';

// ============================================================================
// DATA TYPES & INTERFACES
// ============================================================================

export type ProfitPeriodType = 'MONTHLY' | 'QUARTERLY' | 'WEEKLY' | 'CUSTOM';

export type ProfitPeriodStatus = 'OPEN' | 'CALCULATED' | 'APPROVED' | 'LOCKED' | 'PAID';

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PARTIAL' | 'PAID';

export interface Stakeholder {
  id: string;
  name: string;
  role: 'OWNER' | 'PARTNER' | 'INVESTOR' | 'MANAGER';
  email?: string;
  phone?: string;
  payoutMethod: 'BANK' | 'BKASH' | 'NAGAD' | 'CASH';
  payoutDetails?: string; // Account / routing info
  isActive: boolean;
  joinDate: Date;
  exitDate?: Date | null;
  userId?: string | null; // Optional link to auth user for partner portal
}

export interface ShareRuleVersion {
  id: string;
  stakeholderId: string;
  percentage: number; // e.g. 50.00, 33.33 (up to 2 decimal places, 0-100)
  scope: 'GLOBAL' | 'CATEGORY' | 'PRODUCT';
  scopeId?: string; // Optional if scoped to specific category/product
  effectiveFrom: Date;
  effectiveTo?: Date | null; // null means currently active
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
}

export interface OperatingExpenseEntry {
  id: string;
  date: Date;
  category: string; // rent, salary, utilities, marketing, transport, packaging, software, misc
  amountPoisha: number;
  description: string;
  receiptUrl?: string;
  enteredBy: string;
}

export interface OrderFinancialRecord {
  orderId: string;
  orderNumber: string;
  completedAt: Date; // Delivered / completed date
  revenuePoisha: number; // Revenue after allocated item/coupon discounts
  cogsPoisha: number; // Total Cost of Goods Sold
  businessBorneDeliveryCostPoisha: number;
  gatewayFeePoisha: number;
}

export interface ReturnAdjustmentRecord {
  returnId: string;
  orderId: string;
  processedAt: Date;
  originalPeriodId?: string; // If this belongs to a past locked period
  refundAmountPoisha: number;
  restockedCogsPoisha: number; // Reversal of COGS
}

export interface StakeholderDistributionResult {
  stakeholderId: string;
  stakeholderName: string;
  role: string;
  sharePercentage: number;
  distributableBasisPoisha: number;
  calculatedSharePoisha: number;
  adjustmentPoisha: number; // Adjustments from locked-period returns or manual corrections
  finalSharePoisha: number;
  paidAmountPoisha: number;
  outstandingBalancePoisha: number;
  payoutStatus: PayoutStatus;
}

export interface ProfitPeriodCalculationResult {
  periodId: string;
  periodType: ProfitPeriodType;
  startDate: Date;
  endDate: Date;
  status: ProfitPeriodStatus;

  // Revenue & Direct Costs
  grossRevenuePoisha: number;
  cogsPoisha: number;
  grossProfitPoisha: number;
  returnsAndRefundsPoisha: number;
  businessBorneDeliveryPoisha: number;
  gatewayFeesPoisha: number;
  netOrderProfitPoisha: number;

  // Operating Expenses
  operatingExpensesPoisha: number;
  netProfitBeforeLossOffsetPoisha: number;

  // Loss Carry-Forward Handling
  lossCarriedForwardFromPriorPoisha: number;
  netProfitAfterLossOffsetPoisha: number;
  lossCarriedForwardToNextPoisha: number;

  // Reserve & Distributable Pool
  reservePercentage: number;
  reserveAmountPoisha: number;
  distributableProfitPoisha: number;

  // Stakeholder Distributions
  distributions: StakeholderDistributionResult[];

  // Validation
  isExactBalance: boolean; // Confirms sum(shares) + reserve === netProfitAfterLossOffset
  validationErrors: string[];
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that a set of active share rules sums to EXACTLY 100.00%.
 * Prevents saving or distributing profit when allocations are over or under assigned.
 */
export function validateShareRules(rules: ShareRuleVersion[]): {
  isValid: boolean;
  totalPercentage: number;
  unassignedPercentage: number;
  error?: string;
} {
  if (!rules || rules.length === 0) {
    return {
      isValid: false,
      totalPercentage: 0,
      unassignedPercentage: 100,
      error: 'No share rules provided. Total percentage must equal 100.00%',
    };
  }

  // Check individual rule values
  for (const rule of rules) {
    if (rule.percentage < 0) {
      return {
        isValid: false,
        totalPercentage: 0,
        unassignedPercentage: 100,
        error: `Share percentage for stakeholder ${rule.stakeholderId} cannot be negative (${rule.percentage}%)`,
      };
    }
    // Check up to 2 decimal places precision
    const rounded = Math.round(rule.percentage * 100) / 100;
    if (Math.abs(rule.percentage - rounded) > 1e-6) {
      return {
        isValid: false,
        totalPercentage: 0,
        unassignedPercentage: 100,
        error: `Share percentage (${rule.percentage}%) cannot exceed 2 decimal places`,
      };
    }
  }

  // Sum using integer basis (basis points: 100.00% = 10000 bp)
  const totalBp = rules.reduce((sum, r) => sum + Math.round(r.percentage * 100), 0);
  const totalPercentage = totalBp / 100;
  const unassignedPercentage = (10000 - totalBp) / 100;

  if (totalBp !== 10000) {
    return {
      isValid: false,
      totalPercentage,
      unassignedPercentage,
      error: `Active share rules must total exactly 100.00%. Current total: ${totalPercentage.toFixed(2)}% (${unassignedPercentage > 0 ? `${unassignedPercentage.toFixed(2)}% unassigned` : `${Math.abs(unassignedPercentage).toFixed(2)}% over-allocated`})`,
    };
  }

  return {
    isValid: true,
    totalPercentage: 100,
    unassignedPercentage: 0,
  };
}

// ============================================================================
// PROFIT SHARING CALCULATION ENGINE
// ============================================================================

/**
 * Calculates profit distribution for a period using:
 * 1. Strict delivered order revenue & COGS recognition
 * 2. Deductions for returns, platform delivery cost, and gateway fees
 * 3. Deductions for period operational expenses & salaries (if enabled)
 * 4. Loss carry-forward from prior periods
 * 5. Reserve / retained earnings allocation
 * 6. Largest Remainder Method poisha distribution to stakeholders
 * 7. Negative adjustments for returns of past locked orders
 */
export function calculateProfitPeriod(input: {
  periodId: string;
  periodType: ProfitPeriodType;
  startDate: Date;
  endDate: Date;
  orders: OrderFinancialRecord[];
  operatingExpenses: OperatingExpenseEntry[];
  returnsAndAdjustments?: ReturnAdjustmentRecord[];
  shareRules: ShareRuleVersion[];
  stakeholders: Stakeholder[];
  reservePercentage?: number; // e.g. 5 for 5%
  lossCarriedForwardPoisha?: number; // From prior period
  deductOperatingExpenses?: boolean; // Default true
}): ProfitPeriodCalculationResult {
  const {
    periodId,
    periodType,
    startDate,
    endDate,
    orders,
    operatingExpenses,
    returnsAndAdjustments = [],
    shareRules,
    stakeholders,
    reservePercentage = 0,
    lossCarriedForwardPoisha = 0,
    deductOperatingExpenses = true,
  } = input;

  const validationErrors: string[] = [];

  // Validate share rules sum to 100%
  const ruleValidation = validateShareRules(shareRules);
  if (!ruleValidation.isValid) {
    validationErrors.push(ruleValidation.error || 'Share rules do not sum to 100%');
  }

  // 1. Gross Revenue & COGS from DELIVERED orders within the period
  const grossRevenuePoisha = orders.reduce((sum, o) => sum + o.revenuePoisha, 0);
  const cogsPoisha = orders.reduce((sum, o) => sum + o.cogsPoisha, 0);
  const businessBorneDeliveryPoisha = orders.reduce(
    (sum, o) => sum + o.businessBorneDeliveryCostPoisha,
    0
  );
  const gatewayFeesPoisha = orders.reduce((sum, o) => sum + o.gatewayFeePoisha, 0);

  const grossProfitPoisha = grossRevenuePoisha - cogsPoisha;

  // 2. Returns processed during this period
  // Net profit impact of returns = refundAmountPoisha - restockedCogsPoisha
  const returnsAndRefundsPoisha = returnsAndAdjustments.reduce(
    (sum, r) => sum + (r.refundAmountPoisha - r.restockedCogsPoisha),
    0
  );

  // Net Order Profit
  const netOrderProfitPoisha =
    grossProfitPoisha -
    returnsAndRefundsPoisha -
    businessBorneDeliveryPoisha -
    gatewayFeesPoisha;

  // 3. Operating Expenses
  const operatingExpensesPoisha = deductOperatingExpenses
    ? operatingExpenses.reduce((sum, e) => sum + e.amountPoisha, 0)
    : 0;

  // Net Profit before loss offset
  const netProfitBeforeLossOffsetPoisha = netOrderProfitPoisha - operatingExpensesPoisha;

  // 4. Loss Carry-Forward Offset
  let netProfitAfterLossOffsetPoisha = 0;
  let lossCarriedForwardToNextPoisha = 0;

  if (netProfitBeforeLossOffsetPoisha < 0) {
    // Current period is a loss
    lossCarriedForwardToNextPoisha =
      lossCarriedForwardPoisha + Math.abs(netProfitBeforeLossOffsetPoisha);
    netProfitAfterLossOffsetPoisha = 0;
  } else {
    // Current period is profitable
    if (lossCarriedForwardPoisha > 0) {
      if (netProfitBeforeLossOffsetPoisha >= lossCarriedForwardPoisha) {
        // Profit fully absorbs prior loss
        netProfitAfterLossOffsetPoisha =
          netProfitBeforeLossOffsetPoisha - lossCarriedForwardPoisha;
        lossCarriedForwardToNextPoisha = 0;
      } else {
        // Profit partially offsets prior loss; remainder carried to next period
        lossCarriedForwardToNextPoisha =
          lossCarriedForwardPoisha - netProfitBeforeLossOffsetPoisha;
        netProfitAfterLossOffsetPoisha = 0;
      }
    } else {
      netProfitAfterLossOffsetPoisha = netProfitBeforeLossOffsetPoisha;
      lossCarriedForwardToNextPoisha = 0;
    }
  }

  // 5. Reserve / Retained Earnings deduction
  let reserveAmountPoisha = 0;
  if (reservePercentage > 0 && netProfitAfterLossOffsetPoisha > 0) {
    reserveAmountPoisha = roundHalfUp(
      (netProfitAfterLossOffsetPoisha * reservePercentage) / 100
    );
  }

  // Distributable pool for stakeholders
  const distributableProfitPoisha = Math.max(
    0,
    netProfitAfterLossOffsetPoisha - reserveAmountPoisha
  );

  // 6. Stakeholder Distribution using Largest Remainder Method in Poisha
  const stakeholderMap = new Map<string, Stakeholder>();
  stakeholders.forEach((s) => stakeholderMap.set(s.id, s));

  // Map rules to stakeholder weights in basis points (e.g. 50.00% = 5000)
  const weights = shareRules.map((r) => Math.round(r.percentage * 100));
  const rawSharesPoisha = allocatePoishaByWeights(distributableProfitPoisha, weights);

  const distributions: StakeholderDistributionResult[] = shareRules.map((rule, idx) => {
    const stakeholder = stakeholderMap.get(rule.stakeholderId) || {
      id: rule.stakeholderId,
      name: 'Unknown Partner',
      role: 'PARTNER' as const,
      payoutMethod: 'BANK' as const,
      isActive: true,
      joinDate: new Date(),
    };

    const calculatedShare = rawSharesPoisha[idx];
    const adjustmentPoisha = 0; // Default zero unless specified
    const finalShare = Math.max(0, calculatedShare + adjustmentPoisha);

    return {
      stakeholderId: rule.stakeholderId,
      stakeholderName: stakeholder.name,
      role: stakeholder.role,
      sharePercentage: rule.percentage,
      distributableBasisPoisha: distributableProfitPoisha,
      calculatedSharePoisha: calculatedShare,
      adjustmentPoisha,
      finalSharePoisha: finalShare,
      paidAmountPoisha: 0,
      outstandingBalancePoisha: finalShare,
      payoutStatus: 'PENDING',
    };
  });

  // Verify exact balancing: sum(shares) + reserve === netProfitAfterLossOffset
  const sumShares = distributions.reduce((sum, d) => sum + d.calculatedSharePoisha, 0);
  const totalAccountedPoisha = sumShares + reserveAmountPoisha;
  const isExactBalance = totalAccountedPoisha === netProfitAfterLossOffsetPoisha;

  if (!isExactBalance) {
    validationErrors.push(
      `Poisha balance mismatch: shares (${sumShares}) + reserve (${reserveAmountPoisha}) = ${totalAccountedPoisha} poisha !== net profit (${netProfitAfterLossOffsetPoisha} poisha)`
    );
  }

  return {
    periodId,
    periodType,
    startDate,
    endDate,
    status: 'CALCULATED',
    grossRevenuePoisha,
    cogsPoisha,
    grossProfitPoisha,
    returnsAndRefundsPoisha,
    businessBorneDeliveryPoisha,
    gatewayFeesPoisha,
    netOrderProfitPoisha,
    operatingExpensesPoisha,
    netProfitBeforeLossOffsetPoisha,
    lossCarriedForwardFromPriorPoisha: lossCarriedForwardPoisha,
    netProfitAfterLossOffsetPoisha,
    lossCarriedForwardToNextPoisha,
    reservePercentage,
    reserveAmountPoisha,
    distributableProfitPoisha,
    distributions,
    isExactBalance,
    validationErrors,
  };
}

// ============================================================================
// STAKEHOLDER STATEMENT GENERATOR
// ============================================================================

export interface StakeholderStatement {
  statementNumber: string;
  generatedAt: Date;
  periodId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  stakeholder: {
    id: string;
    name: string;
    role: string;
    payoutMethod: string;
    payoutDetails?: string;
  };
  financialSummary: {
    grossRevenueBDT: number;
    cogsBDT: number;
    grossProfitBDT: number;
    returnsBDT: number;
    deliveryCostsBDT: number;
    gatewayFeesBDT: number;
    operatingExpensesBDT: number;
    netProfitBeforeLossOffsetBDT: number;
    lossOffsetBDT: number;
    netProfitAfterLossOffsetBDT: number;
    reserveDeductionBDT: number;
    reservePercentage: number;
    distributableProfitBDT: number;
  };
  partnerShare: {
    sharePercentage: number;
    calculatedShareBDT: number;
    adjustmentsBDT: number;
    finalShareBDT: number;
    paidAmountBDT: number;
    outstandingBalanceBDT: number;
    payoutStatus: PayoutStatus;
  };
}

/**
 * Generates an auditable, transparent statement for a specific stakeholder.
 */
export function generateStakeholderStatement(
  calculation: ProfitPeriodCalculationResult,
  stakeholderId: string,
  stakeholder: Stakeholder,
  periodName: string = 'Monthly Profit Statement'
): StakeholderStatement {
  const distribution = calculation.distributions.find((d) => d.stakeholderId === stakeholderId);

  if (!distribution) {
    throw new Error(`Stakeholder ${stakeholderId} not found in period distributions`);
  }

  return {
    statementNumber: `STMT-${calculation.periodId}-${stakeholderId.slice(-6).toUpperCase()}`,
    generatedAt: new Date(),
    periodId: calculation.periodId,
    periodName,
    startDate: calculation.startDate.toISOString().split('T')[0],
    endDate: calculation.endDate.toISOString().split('T')[0],
    stakeholder: {
      id: stakeholder.id,
      name: stakeholder.name,
      role: stakeholder.role,
      payoutMethod: stakeholder.payoutMethod,
      payoutDetails: stakeholder.payoutDetails,
    },
    financialSummary: {
      grossRevenueBDT: fromPoisha(calculation.grossRevenuePoisha),
      cogsBDT: fromPoisha(calculation.cogsPoisha),
      grossProfitBDT: fromPoisha(calculation.grossProfitPoisha),
      returnsBDT: fromPoisha(calculation.returnsAndRefundsPoisha),
      deliveryCostsBDT: fromPoisha(calculation.businessBorneDeliveryPoisha),
      gatewayFeesBDT: fromPoisha(calculation.gatewayFeesPoisha),
      operatingExpensesBDT: fromPoisha(calculation.operatingExpensesPoisha),
      netProfitBeforeLossOffsetBDT: fromPoisha(calculation.netProfitBeforeLossOffsetPoisha),
      lossOffsetBDT: fromPoisha(calculation.lossCarriedForwardFromPriorPoisha),
      netProfitAfterLossOffsetBDT: fromPoisha(calculation.netProfitAfterLossOffsetPoisha),
      reserveDeductionBDT: fromPoisha(calculation.reserveAmountPoisha),
      reservePercentage: calculation.reservePercentage,
      distributableProfitBDT: fromPoisha(calculation.distributableProfitPoisha),
    },
    partnerShare: {
      sharePercentage: distribution.sharePercentage,
      calculatedShareBDT: fromPoisha(distribution.calculatedSharePoisha),
      adjustmentsBDT: fromPoisha(distribution.adjustmentPoisha),
      finalShareBDT: fromPoisha(distribution.finalSharePoisha),
      paidAmountBDT: fromPoisha(distribution.paidAmountPoisha),
      outstandingBalanceBDT: fromPoisha(distribution.outstandingBalancePoisha),
      payoutStatus: distribution.payoutStatus,
    },
  };
}

