// utils/profitReportGeneration.ts
// Auto-generate profit reports when orders are delivered

import { prisma } from '@/lib/prisma';

/**
 * Auto-generate profit report for a delivered order
 * Idempotent - checks for existing reports before creating
 */
export async function autoGenerateProfitReport(orderId: string): Promise<{
  success: boolean;
  message: string;
  reportId?: string;
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

      // Calculate profit distribution
      const platformProfitPercent = item.product.platformProfitPercentage || 0;
      const sellerCommissionPercent = item.product.sellerCommissionPercentage || 0;

      const platformProfit = (grossProfit * platformProfitPercent) / 100;
      const remainingProfit = grossProfit - platformProfit;
      const sellerProfit = (remainingProfit * sellerCommissionPercent) / 100;

      totalRevenue += revenue;
      totalCost += cost;
      totalPlatformProfit += platformProfit + (remainingProfit - sellerProfit);
      totalSellerProfit += sellerProfit;
    }

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit; // Simplified
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get seller ID from first item (assuming single seller per order)
    const sellerId = order.orderItems[0]?.product.sellerId || null;

    // Create profit report
    const report = await prisma.profitReport.create({
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

    // Update order with profit info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        totalCost,
        grossProfit,
        platformProfit: totalPlatformProfit,
        sellerProfit: totalSellerProfit,
        profitMargin
      }
    });

    return {
      success: true,
      message: `Profit report generated for order ${order.orderNumber}`,
      reportId: report.id
    };

  } catch (error) {
    console.error('Error generating profit report:', error);
    return {
      success: false,
      message: `Failed to generate profit report: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
