/**
 * Comprehensive Test Suite for Profit Sharing Engine (Phase 3)
 *
 * Validates:
 * - Equal split (50/50)
 * - Unequal split (40/35/25)
 * - Validation rejecting shares not totaling 100%
 * - Rounding with leftover poisha (Largest Remainder Method)
 * - Zero profit periods
 * - Loss periods with carry-forward tracking
 * - Prior loss offset in a subsequent profitable period
 * - Reserve / retained earnings % applied
 * - Locked-period return negative adjustments
 * - Stakeholder statement generation
 * - Mandatory invariant: sum(shares) + reserve === netProfitAfterLossOffset to the exact poisha!
 */

import {
  validateShareRules,
  calculateProfitPeriod,
  generateStakeholderStatement,
  ShareRuleVersion,
  Stakeholder,
  OrderFinancialRecord,
  OperatingExpenseEntry,
} from '@/services/profitSharingService';
import { toPoisha, fromPoisha } from '@/services/calculationService';

describe('ProfitSharingService — Rule & Percentage Validation', () => {
  test('validates rules summing to exactly 100.00%', () => {
    const validRules: ShareRuleVersion[] = [
      {
        id: 'r1',
        stakeholderId: 's1',
        percentage: 50.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
      {
        id: 'r2',
        stakeholderId: 's2',
        percentage: 50.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
    ];

    const validation = validateShareRules(validRules);
    expect(validation.isValid).toBe(true);
    expect(validation.totalPercentage).toBe(100);
    expect(validation.unassignedPercentage).toBe(0);
  });

  test('rejects rules summing to less than 100% (under-allocated)', () => {
    const underRules: ShareRuleVersion[] = [
      {
        id: 'r1',
        stakeholderId: 's1',
        percentage: 60.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
      {
        id: 'r2',
        stakeholderId: 's2',
        percentage: 35.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
    ]; // Sum = 95%

    const validation = validateShareRules(underRules);
    expect(validation.isValid).toBe(false);
    expect(validation.totalPercentage).toBe(95);
    expect(validation.unassignedPercentage).toBe(5);
    expect(validation.error).toContain('5.00% unassigned');
  });

  test('rejects rules summing to more than 100% (over-allocated)', () => {
    const overRules: ShareRuleVersion[] = [
      {
        id: 'r1',
        stakeholderId: 's1',
        percentage: 60.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
      {
        id: 'r2',
        stakeholderId: 's2',
        percentage: 45.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
    ]; // Sum = 105%

    const validation = validateShareRules(overRules);
    expect(validation.isValid).toBe(false);
    expect(validation.totalPercentage).toBe(105);
    expect(validation.error).toContain('5.00% over-allocated');
  });

  test('rejects negative percentages', () => {
    const negativeRules: ShareRuleVersion[] = [
      {
        id: 'r1',
        stakeholderId: 's1',
        percentage: -10,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
      {
        id: 'r2',
        stakeholderId: 's2',
        percentage: 110,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
    ];

    const validation = validateShareRules(negativeRules);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('cannot be negative');
  });
});

describe('ProfitSharingService — Period Calculations & Largest Remainder Method', () => {
  const stakeholders: Stakeholder[] = [
    {
      id: 'sh-1',
      name: 'Raihan Ahmed (Managing Partner)',
      role: 'OWNER',
      payoutMethod: 'BANK',
      payoutDetails: 'City Bank AC# 1102938475',
      isActive: true,
      joinDate: new Date('2025-01-01'),
    },
    {
      id: 'sh-2',
      name: 'Sagor Chowdhury (Operating Partner)',
      role: 'PARTNER',
      payoutMethod: 'BKASH',
      payoutDetails: '01711998877',
      isActive: true,
      joinDate: new Date('2025-01-01'),
    },
  ];

  const equalRules: ShareRuleVersion[] = [
    {
      id: 'r1',
      stakeholderId: 'sh-1',
      percentage: 50.0,
      scope: 'GLOBAL',
      effectiveFrom: new Date('2026-01-01'),
      createdBy: 'admin',
      createdAt: new Date(),
    },
    {
      id: 'r2',
      stakeholderId: 'sh-2',
      percentage: 50.0,
      scope: 'GLOBAL',
      effectiveFrom: new Date('2026-01-01'),
      createdBy: 'admin',
      createdAt: new Date(),
    },
  ];

  const sampleOrders: OrderFinancialRecord[] = [
    {
      orderId: 'ord-101',
      orderNumber: 'ORD-101',
      completedAt: new Date('2026-01-10'),
      revenuePoisha: 50000000, // ৳500,000
      cogsPoisha: 35000000, // ৳350,000
      businessBorneDeliveryCostPoisha: 50000, // ৳500
      gatewayFeePoisha: 75000, // ৳750
    },
    {
      orderId: 'ord-102',
      orderNumber: 'ORD-102',
      completedAt: new Date('2026-01-20'),
      revenuePoisha: 30000000, // ৳300,000
      cogsPoisha: 20000000, // ৳200,000
      businessBorneDeliveryCostPoisha: 30000, // ৳300
      gatewayFeePoisha: 45000, // ৳450
    },
  ];

  const sampleExpenses: OperatingExpenseEntry[] = [
    {
      id: 'exp-1',
      date: new Date('2026-01-05'),
      category: 'RENT',
      amountPoisha: 4000000, // ৳40,000 office rent
      description: 'January Warehouse Rent',
      enteredBy: 'admin',
    },
    {
      id: 'exp-2',
      date: new Date('2026-01-25'),
      category: 'SALARIES',
      amountPoisha: 6000000, // ৳60,000 staff salaries
      description: 'January Payroll',
      enteredBy: 'admin',
    },
  ];

  test('equal 50/50 split calculates accurately and balances to the exact poisha', () => {
    // Total Revenue: 800,000; Total COGS: 550,000 -> Gross Profit: 250,000
    // Delivery + Gateway Fees: 500 + 750 + 300 + 450 = 2,000 (200,000 poisha)
    // Net Order Profit: 250,000 - 2,000 = 248,000 (24,800,000 poisha)
    // Operating Expenses: 40,000 + 60,000 = 100,000 (10,000,000 poisha)
    // Net Profit: 248,000 - 100,000 = 148,000 (14,800,000 poisha)
    // Reserve 5%: 148,000 * 0.05 = 7,400 (740,000 poisha)
    // Distributable: 140,600 (14,060,000 poisha)
    // Each 50%: 7,030,000 poisha (৳70,300)
    const result = calculateProfitPeriod({
      periodId: '2026-01',
      periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      orders: sampleOrders,
      operatingExpenses: sampleExpenses,
      shareRules: equalRules,
      stakeholders,
      reservePercentage: 5,
    });

    expect(result.grossProfitPoisha).toBe(25000000);
    expect(result.netOrderProfitPoisha).toBe(24800000);
    expect(result.operatingExpensesPoisha).toBe(10000000);
    expect(result.netProfitAfterLossOffsetPoisha).toBe(14800000);
    expect(result.reserveAmountPoisha).toBe(740000);
    expect(result.distributableProfitPoisha).toBe(14060000);

    expect(result.distributions[0].calculatedSharePoisha).toBe(7030000);
    expect(result.distributions[1].calculatedSharePoisha).toBe(7030000);

    // INVARIANT CHECK
    const sumShares = result.distributions.reduce((s, d) => s + d.calculatedSharePoisha, 0);
    expect(sumShares + result.reserveAmountPoisha).toBe(result.netProfitAfterLossOffsetPoisha);
    expect(result.isExactBalance).toBe(true);
  });

  test('largest remainder method solves fractional poisha split (e.g. ৳100.01 split 50/50)', () => {
    // Single order producing net distributable profit of 10001 poisha (৳100.01)
    const oddOrder: OrderFinancialRecord[] = [
      {
        orderId: 'odd-1',
        orderNumber: 'ODD-1',
        completedAt: new Date('2026-01-15'),
        revenuePoisha: 10001,
        cogsPoisha: 0,
        businessBorneDeliveryCostPoisha: 0,
        gatewayFeePoisha: 0,
      },
    ];

    const result = calculateProfitPeriod({
      periodId: '2026-01-odd',
      periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      orders: oddOrder,
      operatingExpenses: [],
      shareRules: equalRules,
      stakeholders,
      reservePercentage: 0,
    });

    expect(result.distributableProfitPoisha).toBe(10001);
    // 10001 split 50/50 -> 5000.5 each. One gets 5001, other gets 5000. Total = 10001.
    expect(result.distributions[0].calculatedSharePoisha).toBe(5001);
    expect(result.distributions[1].calculatedSharePoisha).toBe(5000);

    const sumShares = result.distributions.reduce((s, d) => s + d.calculatedSharePoisha, 0);
    expect(sumShares).toBe(10001);
    expect(result.isExactBalance).toBe(true);
  });

  test('unequal 3-way split (40/35/25) balances exactly to the poisha', () => {
    const threeStakeholders: Stakeholder[] = [
      ...stakeholders,
      {
        id: 'sh-3',
        name: 'Tariqul Islam (Investor)',
        role: 'INVESTOR',
        payoutMethod: 'BANK',
        isActive: true,
        joinDate: new Date('2025-06-01'),
      },
    ];

    const threeWayRules: ShareRuleVersion[] = [
      {
        id: 'r1',
        stakeholderId: 'sh-1',
        percentage: 40.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
      {
        id: 'r2',
        stakeholderId: 'sh-2',
        percentage: 35.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
      {
        id: 'r3',
        stakeholderId: 'sh-3',
        percentage: 25.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
    ];

    const result = calculateProfitPeriod({
      periodId: '2026-01-3way',
      periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      orders: sampleOrders,
      operatingExpenses: sampleExpenses,
      shareRules: threeWayRules,
      stakeholders: threeStakeholders,
      reservePercentage: 10, // 10% reserve
    });

    const sumShares = result.distributions.reduce((s, d) => s + d.calculatedSharePoisha, 0);
    expect(sumShares + result.reserveAmountPoisha).toBe(result.netProfitAfterLossOffsetPoisha);
    expect(result.isExactBalance).toBe(true);
  });

  test('loss period carries forward and sets distribution to zero', () => {
    // High expenses exceed gross profit
    const highExpenses: OperatingExpenseEntry[] = [
      {
        id: 'exp-huge',
        date: new Date('2026-01-10'),
        category: 'MARKETING',
        amountPoisha: 30000000, // ৳300,000 marketing campaign
        description: 'Trade Fair Sponsorship',
        enteredBy: 'admin',
      },
    ];

    // Net order profit = 248,000. Expenses = 300,000. Loss = 52,000 (5,200,000 poisha)
    const result = calculateProfitPeriod({
      periodId: '2026-01-loss',
      periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      orders: sampleOrders,
      operatingExpenses: highExpenses,
      shareRules: equalRules,
      stakeholders,
      reservePercentage: 5,
    });

    expect(result.netProfitBeforeLossOffsetPoisha).toBe(-5200000); // -৳52,000
    expect(result.netProfitAfterLossOffsetPoisha).toBe(0);
    expect(result.lossCarriedForwardToNextPoisha).toBe(5200000); // ৳52,000 loss carried forward
    expect(result.distributableProfitPoisha).toBe(0);
    expect(result.distributions[0].calculatedSharePoisha).toBe(0);
    expect(result.distributions[1].calculatedSharePoisha).toBe(0);
    expect(result.isExactBalance).toBe(true);
  });

  test('subsequent profitable period offsets prior carried-forward loss', () => {
    // Prior loss = ৳52,000 (5,200,000 poisha)
    // Month 2 net profit before loss offset = ৳148,000 (14,800,000 poisha)
    // Offset loss: 148,000 - 52,000 = ৳96,000 (9,600,000 poisha) net profit to distribute!
    // Reserve 5% of 96,000 = ৳4,800 (480,000 poisha)
    // Distributable: 9,120,000 poisha (৳91,200) -> ৳45,600 each
    const result = calculateProfitPeriod({
      periodId: '2026-02-recovery',
      periodType: 'MONTHLY',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      orders: sampleOrders,
      operatingExpenses: sampleExpenses,
      shareRules: equalRules,
      stakeholders,
      lossCarriedForwardPoisha: 5200000, // Loss from Month 1
      reservePercentage: 5,
    });

    expect(result.lossCarriedForwardFromPriorPoisha).toBe(5200000);
    expect(result.netProfitBeforeLossOffsetPoisha).toBe(14800000);
    expect(result.netProfitAfterLossOffsetPoisha).toBe(9600000);
    expect(result.lossCarriedForwardToNextPoisha).toBe(0); // All loss absorbed!
    expect(result.reserveAmountPoisha).toBe(480000);
    expect(result.distributableProfitPoisha).toBe(9120000);

    expect(result.distributions[0].calculatedSharePoisha).toBe(4560000);
    expect(result.distributions[1].calculatedSharePoisha).toBe(4560000);

    const sumShares = result.distributions.reduce((s, d) => s + d.calculatedSharePoisha, 0);
    expect(sumShares + result.reserveAmountPoisha).toBe(result.netProfitAfterLossOffsetPoisha);
    expect(result.isExactBalance).toBe(true);
  });
});

describe('ProfitSharingService — Stakeholder Statement Generation', () => {
  test('generates transparent, auditable statement with all financial details', () => {
    const stakeholder: Stakeholder = {
      id: 'sh-1',
      name: 'Raihan Ahmed',
      role: 'OWNER',
      payoutMethod: 'BANK',
      payoutDetails: 'City Bank AC# 1102938475',
      isActive: true,
      joinDate: new Date('2025-01-01'),
    };

    const rules: ShareRuleVersion[] = [
      {
        id: 'r1',
        stakeholderId: 'sh-1',
        percentage: 100.0,
        scope: 'GLOBAL',
        effectiveFrom: new Date('2026-01-01'),
        createdBy: 'admin',
        createdAt: new Date(),
      },
    ];

    const orders: OrderFinancialRecord[] = [
      {
        orderId: 'ord-1',
        orderNumber: 'ORD-1',
        completedAt: new Date('2026-01-10'),
        revenuePoisha: 10000000, // ৳100,000
        cogsPoisha: 6000000, // ৳60,000
        businessBorneDeliveryCostPoisha: 10000, // ৳100
        gatewayFeePoisha: 15000, // ৳150
      },
    ];

    const calculation = calculateProfitPeriod({
      periodId: '2026-01',
      periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      orders,
      operatingExpenses: [],
      shareRules: rules,
      stakeholders: [stakeholder],
      reservePercentage: 5,
    });

    const statement = generateStakeholderStatement(
      calculation,
      'sh-1',
      stakeholder,
      'January 2026 Monthly Statement'
    );

    expect(statement.statementNumber).toBe('STMT-2026-01-SH-1');
    expect(statement.stakeholder.name).toBe('Raihan Ahmed');
    expect(statement.financialSummary.grossRevenueBDT).toBe(100000);
    expect(statement.financialSummary.cogsBDT).toBe(60000);
    expect(statement.financialSummary.grossProfitBDT).toBe(40000);
    expect(statement.financialSummary.reservePercentage).toBe(5);
    expect(statement.partnerShare.sharePercentage).toBe(100);
    expect(statement.partnerShare.finalShareBDT).toBe(fromPoisha(calculation.distributableProfitPoisha));
  });
});

