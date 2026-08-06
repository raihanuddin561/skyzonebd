// utils/profitReportGeneration.ts
// Auto-generate profit reports when orders are delivered

import { prisma } from '@/lib/prisma';
import { createOrderLedgerEntries } from '@/lib/financialLedger';
import { splitGrossProfit } from '@/utils/profitCalculation';

/**
 * Auto-generate profit report for a delivered order
 * Idempotent - checks for existing reports before creating
 */
export async function autoGenerateProfitReport(orderId: string): Promise<{
  success: boolean;
  message: string;
  reportId?: string;
  ledgerPosted?: boolean;
}> {
  try {
    // Check if profit report already exists for this order (idempotency)
    const existingReport = await prisma.profitReport.findFirst({
      where: { orderId }
    });

    if (existingReport) {
      return {
        success: false,
        message: `Profit report already exists for order ${orderId}`
      };
    }

    // Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                costPerUnit: true,
                basePrice: true,
                platformProfitPercentage: true,
                sellerCommissionPercentage: true,
                sellerId: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return {
        success: false,
        message: `Order ${orderId} not found`
      };
    }

    // Only generate report for delivered orders
    if (order.status !== 'DELIVERED') {
      return {
        success: false,
        message: `Order ${orderId} is not delivered (status: ${order.status})`
      };
    }

    // Calculate totals using snapshotted values
    let totalRevenue = 0;
    let totalCost = 0;
    let totalPlatformProfit = 0;
    let totalSellerProfit = 0;

    for (const item of order.orderItems) {
      const revenue = item.total;
      
      // Use snapshotted values from order item (already stored at order creation)
      // Fall back to current product prices only for old orders without snapshots
      const costPerUnit = item.costPerUnit ?? item.product.costPerUnit ?? item.product.basePrice ?? 0;
      const cost = costPerUnit * item.quantity;
      const grossProfit = item.totalProfit ?? (revenue - cost);

      // Calculate profit distribution (canonical split — see
      // utils/profitCalculation.ts's splitGrossProfit)
      const platformProfitPercent = item.product.platformProfitPercentage || 0;
      const sellerCommissionPercent = item.product.sellerCommissionPercentage || 0;

      const { platformProfit, sellerProfit } = splitGrossProfit(
        grossProfit,
        platformProfitPercent,
        sellerCommissionPercent
      );

      totalRevenue += revenue;
      totalCost += cost;
      totalPlatformProfit += platformProfit;
      totalSellerProfit += sellerProfit;
    }

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit; // Simplified
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get seller ID from first item (assuming single seller per order)
    const sellerId = order.orderItems[0]?.product.sellerId || null;

    // Create the profit report and update the order's profit fields
    // atomically — previously these were two independent calls, so a
    // failure on the order update left a ProfitReport row with no
    // corresponding update to Order.totalCost/grossProfit/etc (P1-2).
    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.profitReport.create({
        data: {
          orderId,
          revenue: totalRevenue,
          costOfGoods: totalCost,
          grossProfit,
          shippingExpense: 0,
          handlingExpense: 0,
          platformExpense: 0,
          marketingExpense: 0,
          otherExpenses: 0,
          totalExpenses: 0,
          netProfit,
          profitMargin,
          platformProfit: totalPlatformProfit,
          platformProfitPercent: grossProfit > 0 ? (totalPlatformProfit / grossProfit) * 100 : 0,
          sellerProfit: totalSellerProfit,
          sellerProfitPercent: grossProfit > 0 ? (totalSellerProfit / grossProfit) * 100 : 0,
          sellerId,
          reportPeriod: 'daily',
          reportDate: new Date()
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          totalCost,
          grossProfit,
          platformProfit: totalPlatformProfit,
          sellerProfit: totalSellerProfit,
          profitMargin
        }
      });

      return created;
    });

    // Ledger posting happens after the report/order transaction commits,
    // deliberately: the profit numbers are the primary business fact and
    // should stand even if the ledger mirror of them hits a transient
    // failure. That failure must not be silent, though — it's surfaced in
    // the return value (`ledgerPosted: false`) so every caller can log and
    // act on it, rather than being swallowed in a try/catch that only
    // printed to the console (P1-2). The existing FinancialLedger
    // `isReconciled` flag remains the durable, queryable trail for
    // whichever entries *did* post; a `false` here means this order's
    // entries never posted at all and generation should be retried.
    let ledgerPosted = true;
    try {
      await createOrderLedgerEntries({
        id: order.id,
        orderNumber: order.orderNumber,
        total: totalRevenue,
        userId: order.userId,
        guestName: order.guestName,
        orderItems: order.orderItems.map(item => ({
          quantity: item.quantity,
          costPerUnit: item.costPerUnit ?? item.product.costPerUnit ?? item.product.basePrice ?? 0,
        })),
      });
    } catch (ledgerError) {
      ledgerPosted = false;
      console.error(`Failed to create ledger entries for order ${order.orderNumber} (reportId=${report.id}) — needs manual reconciliation:`, ledgerError);
    }

    return {
      success: true,
      message: ledgerPosted
        ? `Profit report generated for order ${order.orderNumber}`
        : `Profit report generated for order ${order.orderNumber}, but ledger posting FAILED and needs manual reconciliation`,
      reportId: report.id,
      ledgerPosted
    };

  } catch (error) {
    console.error('Error generating profit report:', error);
    return {
      success: false,
      message: `Failed to generate profit report: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
