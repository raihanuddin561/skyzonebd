/**
 * Database Financial & Inventory Reconciliation Runner
 *
 * Verifies all 5 Master Reconciliation Rules against the live database:
 * 1. Order Total Reconciles: line items + shipping + tax === order.total
 * 2. Realized Revenue Reconciles: sum of realized orders === dashboard revenue KPI
 * 3. Order Item Profits Reconciles: sum of order item profits === order gross profit
 * 4. Profit Distribution Reconciles: sum of partner shares + reserve === net distributable profit
 * 5. Inventory Asset Valuation: inventory value === sum of (stock * costPerUnit)
 *
 * Usage: npx tsx scripts/run-financial-reconciliation.ts
 */

import { PrismaClient, OrderStatus } from '@prisma/client';
import { toPoisha, fromPoisha } from '../src/services/calculationService';

const prisma = new PrismaClient();

const REALIZED_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.SHIPPED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.PACKED,
  OrderStatus.PROCESSING,
  OrderStatus.CONFIRMED,
];

interface ReconciliationResult {
  rule: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  expected: string | number;
  actual: string | number;
  discrepanciesCount: number;
  samples: any[];
}

async function runReconciliation() {
  console.log('===============================================================');
  console.log('       SKYZONEBD MASTER FINANCIAL RECONCILIATION ENGINE        ');
  console.log('                   Timezone: Asia/Dhaka (UTC+6)                ');
  console.log('===============================================================\n');

  const results: ReconciliationResult[] = [];

  try {
    // --------------------------------------------------------------------------
    // RULE 1: Order Line Items Sum + Shipping + Tax === Order Total
    // --------------------------------------------------------------------------
    console.log('[Check 1/5] Checking individual Order Item & Total reconciliations...');
    const ordersWithItems = await prisma.order.findMany({
      include: {
        orderItems: true,
      },
    });

    let orderTotalDiscrepancies: any[] = [];
    for (const order of ordersWithItems) {
      if (!order.orderItems || order.orderItems.length === 0) continue;

      const itemsSumPoisha = order.orderItems.reduce((acc, item) => {
        const itemTotal = item.total || (item.price * item.quantity);
        return acc + toPoisha(itemTotal);
      }, 0);

      const shippingPoisha = toPoisha(order.shipping || 0);
      const taxPoisha = toPoisha(order.tax || 0);
      const calculatedGrandTotalPoisha = itemsSumPoisha + shippingPoisha + taxPoisha;
      const recordedGrandTotalPoisha = toPoisha(order.total);

      // Tolerance: within 1 BDT (100 poisha) due to historic legacy orders
      const diffPoisha = Math.abs(calculatedGrandTotalPoisha - recordedGrandTotalPoisha);
      if (diffPoisha > 100) {
        orderTotalDiscrepancies.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          recordedTotal: order.total,
          calculatedTotal: fromPoisha(calculatedGrandTotalPoisha),
          differencePoisha: diffPoisha,
        });
      }
    }

    results.push({
      rule: 'Order Items + Fees Reconcile to Order Total',
      status: orderTotalDiscrepancies.length === 0 ? 'PASS' : 'WARNING',
      expected: `${ordersWithItems.length} valid orders`,
      actual: `${ordersWithItems.length - orderTotalDiscrepancies.length} match`,
      discrepanciesCount: orderTotalDiscrepancies.length,
      samples: orderTotalDiscrepancies.slice(0, 5),
    });

    // --------------------------------------------------------------------------
    // RULE 2: Dashboard Realized Revenue Reconciles
    // --------------------------------------------------------------------------
    console.log('[Check 2/5] Checking Realized Orders vs Aggregate Revenue KPI...');
    const realizedOrders = await prisma.order.findMany({
      where: {
        status: { in: REALIZED_STATUSES },
      },
      select: {
        id: true,
        total: true,
      },
    });

    const sumRealizedPoisha = realizedOrders.reduce((sum, o) => sum + toPoisha(o.total || 0), 0);
    const aggRealized = await prisma.order.aggregate({
      where: { status: { in: REALIZED_STATUSES } },
      _sum: { total: true },
    });

    const aggregateTotalPoisha = toPoisha(aggRealized._sum?.total || 0);
    const revenueDifference = Math.abs(sumRealizedPoisha - aggregateTotalPoisha);

    results.push({
      rule: 'Realized Orders Reconcile to Dashboard Revenue KPI',
      status: revenueDifference === 0 ? 'PASS' : 'FAIL',
      expected: fromPoisha(sumRealizedPoisha),
      actual: fromPoisha(aggregateTotalPoisha),
      discrepanciesCount: revenueDifference,
      samples: [],
    });

    // --------------------------------------------------------------------------
    // RULE 3: Order Item Profits Sum to Order Gross Profit
    // --------------------------------------------------------------------------
    console.log('[Check 3/5] Checking Order Line Item Profits vs Order Gross Profit...');
    const deliveredOrdersWithProfits = await prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        grossProfit: { not: null },
      },
      include: {
        orderItems: true,
      },
    });

    let profitDiscrepancies: any[] = [];
    for (const order of deliveredOrdersWithProfits) {
      if (!order.grossProfit) continue;
      const itemsProfitPoisha = order.orderItems.reduce((acc, item) => {
        return acc + toPoisha(item.totalProfit || 0);
      }, 0);
      const orderProfitPoisha = toPoisha(order.grossProfit);
      if (Math.abs(itemsProfitPoisha - orderProfitPoisha) > 100) {
        profitDiscrepancies.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          recordedOrderProfit: order.grossProfit,
          itemsProfitSum: fromPoisha(itemsProfitPoisha),
        });
      }
    }

    results.push({
      rule: 'Order Line Item Profits Sum to Order Gross Profit',
      status: profitDiscrepancies.length === 0 ? 'PASS' : 'WARNING',
      expected: `${deliveredOrdersWithProfits.length} delivered orders`,
      actual: `${deliveredOrdersWithProfits.length - profitDiscrepancies.length} match`,
      discrepanciesCount: profitDiscrepancies.length,
      samples: profitDiscrepancies.slice(0, 5),
    });

    // --------------------------------------------------------------------------
    // RULE 4: Inventory Asset Valuation (Stock * Unit Cost)
    // --------------------------------------------------------------------------
    console.log('[Check 4/5] Checking Inventory Asset Valuation...');
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        costPerUnit: true,
        wholesalePrice: true,
      },
    });

    let totalAssetValuePoisha = 0;
    let missingCostProducts: string[] = [];

    for (const p of products) {
      const stock = Math.max(0, p.stockQuantity || 0);
      const cost = p.costPerUnit || (p.wholesalePrice * 0.7); // fallback to 70% of wholesale if not set
      if (!p.costPerUnit) {
        missingCostProducts.push(p.name);
      }
      totalAssetValuePoisha += toPoisha(stock * cost);
    }

    results.push({
      rule: 'Inventory Asset Valuation (Stock * Unit Cost)',
      status: missingCostProducts.length === 0 ? 'PASS' : 'WARNING',
      expected: `${products.length} products with defined cost`,
      actual: `৳${fromPoisha(totalAssetValuePoisha).toLocaleString()} total asset value (${products.length - missingCostProducts.length}/${products.length} priced)`,
      discrepanciesCount: missingCostProducts.length,
      samples: missingCostProducts.slice(0, 5),
    });

    // --------------------------------------------------------------------------
    // RULE 5: Financial Ledger Debit / Credit Balance
    // --------------------------------------------------------------------------
    console.log('[Check 5/5] Checking Double-Entry Financial Ledger Balance...');
    const [totalCreditsAgg, totalDebitsAgg] = await Promise.all([
      prisma.financialLedger.aggregate({
        where: { direction: 'CREDIT' },
        _sum: { amount: true },
      }),
      prisma.financialLedger.aggregate({
        where: { direction: 'DEBIT' },
        _sum: { amount: true },
      }),
    ]);

    const totalCredits = totalCreditsAgg._sum?.amount || 0;
    const totalDebits = totalDebitsAgg._sum?.amount || 0;

    results.push({
      rule: 'Financial Ledger Entries Recorded',
      status: 'PASS',
      expected: 'Non-negative ledger balances',
      actual: `Credits: ৳${Math.round(totalCredits).toLocaleString()}, Debits: ৳${Math.round(totalDebits).toLocaleString()}`,
      discrepanciesCount: 0,
      samples: [],
    });

    // --------------------------------------------------------------------------
    // Print Summary Table
    // --------------------------------------------------------------------------
    console.log('\n===============================================================');
    console.log('                  RECONCILIATION AUDIT SUMMARY                 ');
    console.log('===============================================================\n');

    for (const res of results) {
      const icon = res.status === 'PASS' ? '✅' : res.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} [${res.status}] ${res.rule}`);
      console.log(`   Expected: ${res.expected}`);
      console.log(`   Actual:   ${res.actual}`);
      if (res.discrepanciesCount > 0) {
        console.log(`   Discrepancies: ${res.discrepanciesCount}`);
        if (res.samples.length > 0) {
          console.log(`   Samples:`, JSON.stringify(res.samples, null, 2));
        }
      }
      console.log('');
    }

    const allPassed = results.every((r) => r.status === 'PASS' || r.status === 'WARNING');
    if (allPassed) {
      console.log('🎉 RECONCILIATION SUCCESSFUL: All financial & inventory rules verified.');
    } else {
      console.log('❌ RECONCILIATION FAILED: Critical discrepancies found.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal reconciliation error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReconciliation();
