/**
 * Order Fulfillment Service
 * 
 * Handles order completion, COGS finalization, stock allocation,
 * returns, and profit reporting.
 */

import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { allocateStockFIFO, allocateStockWAC } from './inventoryService';
import { calculateOrderDue } from './paymentService';
import { CostingMethod } from './inventoryService';

/**
 * Complete order delivery and finalize COGS
 * This should be called when order status changes to DELIVERED
 * Allocates stock, calculates COGS, and creates profit report
 */
export async function completeOrderDelivery({
  orderId,
  completedBy,
  costingMethod = 'FIFO',
}: {
  orderId: string;
  completedBy: string;
  costingMethod?: CostingMethod;
}) {
  return await prisma.$transaction(async (tx) => {
    // Get order with items
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if order is already delivered (completed)
    if (order.status === OrderStatus.DELIVERED) {
      // This could be a re-run, check if COGS already calculated
      const existingReport = await tx.profitReport.findFirst({
        where: { orderId },
      });
      if (existingReport) {
        throw new Error('Order already completed with COGS calculated');
      }
    }
    
    // Allow completion from DELIVERED or IN_TRANSIT status
    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.IN_TRANSIT) {
      throw new Error('Order must be in DELIVERED status before completion. Current status: ' + order.status);
    }
    
    let totalCOGS = 0;
    let totalRevenue = 0;
    
    // Process each order item
    for (const item of order.orderItems) {
      // Allocate stock and calculate COGS
      const allocation = costingMethod === 'FIFO'
        ? await allocateStockFIFO({
            productId: item.productId,
            quantity: item.quantity,
            orderId: order.id,
            orderItemId: item.id,
          })
        : await allocateStockWAC({
            productId: item.productId,
            quantity: item.quantity,
            orderId: order.id,
            orderItemId: item.id,
          });
      
      const itemCOGS = allocation.totalCost;
      const itemRevenue = item.total;
      const itemProfit = itemRevenue - itemCOGS;
      
      // Update order item with final COGS
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          costPerUnit: allocation.averageCost,
          profitPerUnit: (item.price - allocation.averageCost),
          totalProfit: itemProfit,
          profitMargin: itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0,
        },
      });
      
      totalCOGS += itemCOGS;
      totalRevenue += itemRevenue;
    }
    
    // Calculate order-level profit
    const grossProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    // Calculate expenses (shipping already in order)
    const shippingExpense = order.shipping || 0;
    const netProfit = grossProfit - shippingExpense;
    
    // Update order with COGS and profit (keep status as DELIVERED)
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        // Status remains DELIVERED
        status: OrderStatus.DELIVERED,
        totalCost: totalCOGS,
        grossProfit: grossProfit,
        profitMargin: profitMargin,
      },
    });
    
    // Create profit report
    await tx.profitReport.create({
      data: {
        orderId: order.id,
        revenue: totalRevenue,
        costOfGoods: totalCOGS,
        grossProfit: grossProfit,
        
        // Expenses
        shippingExpense: shippingExpense,
        handlingExpense: 0,
        platformExpense: 0,
        marketingExpense: 0,
        otherExpenses: 0,
        totalExpenses: shippingExpense,
        
        netProfit: netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        
        // Platform/seller split (can be enhanced based on product seller)
        platformProfit: netProfit,
        platformProfitPercent: 100,
        sellerProfit: 0,
        sellerProfitPercent: 0,
        
        reportDate: new Date(),
      },
    });
    
    // Log to financial ledger - COGS
    await tx.financialLedger.create({
      data: {
        sourceType: 'ORDER',
        sourceId: order.id,
        sourceName: `COGS for order ${order.orderNumber}`,
        amount: totalCOGS,
        direction: 'DEBIT',
        category: 'COGS',
        description: `Cost of goods sold - ${costingMethod} method`,
        orderId: order.id,
        partyId: order.userId || undefined,
        partyName: order.userId ? order.user?.name : order.guestName || 'Guest',
        partyType: order.userId ? 'CUSTOMER' : 'GUEST',
        createdBy: completedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    // Log revenue to financial ledger
    await tx.financialLedger.create({
      data: {
        sourceType: 'ORDER',
        sourceId: order.id,
        sourceName: `Revenue from order ${order.orderNumber}`,
        amount: totalRevenue,
        direction: 'CREDIT',
        category: 'REVENUE',
        description: 'Order completed and revenue recognized',
        orderId: order.id,
        partyId: order.userId || undefined,
        partyName: order.userId ? order.user?.name : order.guestName || 'Guest',
        partyType: order.userId ? 'CUSTOMER' : 'GUEST',
        createdBy: completedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return {
      order: updatedOrder,
      cogs: totalCOGS,
      grossProfit,
      netProfit,
      profitMargin,
    };
  });
}

/**
 * Handle order returns and stock restoration
 * Restores stock quantities and updates order status
 */
export async function processOrderReturn({
  orderId,
  reason,
  processedBy,
  restockItems = true,
}: {
  orderId: string;
  reason: string;
  processedBy: string;
  restockItems?: boolean;
}) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.status === OrderStatus.RETURNED) {
      throw new Error('Order already marked as returned');
    }
    
    // Restore stock for each item if requested
    if (restockItems) {
      for (const item of order.orderItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true, name: true },
        });
        
        if (!product) continue;
        
        const previousStock = product.stockQuantity;
        const newStock = previousStock + item.quantity;
        
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: newStock,
          },
        });
        
        // Log inventory return
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'RETURN',
            quantity: item.quantity,
            previousStock,
            newStock,
            reference: orderId,
            notes: `Returned from order ${order.orderNumber}: ${reason}`,
            performedBy: processedBy,
          },
        });
      }
    }
    
    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.RETURNED,
      },
    });
    
    // Log to financial ledger (return reverses revenue)
    await tx.financialLedger.create({
      data: {
        sourceType: 'RETURN',
        sourceId: order.id,
        sourceName: `Return for order ${order.orderNumber}`,
        amount: order.total,
        direction: 'DEBIT',
        category: 'RETURNS',
        description: `Order returned: ${reason}`,
        orderId: order.id,
        partyId: order.userId || undefined,
        partyName: order.userId ? order.user?.name : order.guestName || 'Guest',
        partyType: order.userId ? 'CUSTOMER' : 'GUEST',
        createdBy: processedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return updatedOrder;
  });
}

/**
 * Update order status (with validation)
 * Triggers completion when status changes to DELIVERED
 */
export async function updateOrderStatus({
  orderId,
  status,
  updatedBy,
  notes,
  autoCompleteOnDelivered = true,
  costingMethod = 'FIFO',
}: {
  orderId: string;
  status: OrderStatus;
  updatedBy: string;
  notes?: string;
  autoCompleteOnDelivered?: boolean;
  costingMethod?: CostingMethod;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, orderNumber: true },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: status,
    },
  });
  
  // Auto-complete when delivered
  if (status === OrderStatus.DELIVERED && autoCompleteOnDelivered) {
    try {
      await completeOrderDelivery({
        orderId,
        completedBy: updatedBy,
        costingMethod,
      });
    } catch (error: any) {
      console.error('Auto-completion failed:', error.message);
      // Don't fail the status update if completion fails
      // Admin can manually trigger completion later
    }
  }
  
  return updatedOrder;
}

/**
 * Get profit report for an order
 */
export async function getOrderProfitReport(orderId: string) {
  const report = await prisma.profitReport.findFirst({
    where: { orderId },
    include: {
      order: {
        select: {
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
  
  return report;
}

/**
 * Get profit reports for a date range
 */
export async function getProfitReports(startDate: Date, endDate: Date) {
  const reports = await prisma.profitReport.findMany({
    where: {
      reportDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
    orderBy: {
      reportDate: 'desc',
    },
  });
  
  // Calculate totals
  const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0);
  const totalCOGS = reports.reduce((sum, r) => sum + r.costOfGoods, 0);
  const totalGrossProfit = reports.reduce((sum, r) => sum + r.grossProfit, 0);
  const totalExpenses = reports.reduce((sum, r) => sum + r.totalExpenses, 0);
  const totalNetProfit = reports.reduce((sum, r) => sum + r.netProfit, 0);
  
  return {
    reports,
    summary: {
      totalRevenue,
      totalCOGS,
      totalGrossProfit,
      grossMargin: totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0,
      totalExpenses,
      totalNetProfit,
      netMargin: totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0,
      orderCount: reports.length,
    },
  };
}

/**
 * Validate order can be completed
 */
export async function validateOrderForCompletion(orderId: string): Promise<{
  canComplete: boolean;
  errors: string[];
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
  
  if (!order) {
    return { canComplete: false, errors: ['Order not found'] };
  }
  
  const errors: string[] = [];
  
  // Check if already completed by looking for profit report
  const existingReport = await prisma.profitReport.findFirst({
    where: { orderId: order.id },
  });
  
  if (existingReport) {
    errors.push('Order is already completed (profit report exists)');
  }
  
  if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.IN_TRANSIT) {
    errors.push('Order must be in DELIVERED status');
  }
  
  // Check stock availability
  for (const item of order.orderItems) {
    if (item.product.stockQuantity < item.quantity) {
      errors.push(`Insufficient stock for ${item.product.name}. Available: ${item.product.stockQuantity}, Required: ${item.quantity}`);
    }
  }
  
  return {
    canComplete: errors.length === 0,
    errors,
  };
}
