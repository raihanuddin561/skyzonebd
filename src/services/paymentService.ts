/**
 * Payment Service
 * 
 * Handles payment recording, due calculation, refunds, and payment tracking
 * for orders with support for partial payments.
 */

import { prisma } from '@/lib/db';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';

export interface OrderDueInfo {
  total: number;
  paid: number;
  due: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING';
}

/**
 * Calculate order due amount
 * Returns total, paid, due, and payment status
 */
export async function calculateOrderDue(orderId: string): Promise<OrderDueInfo> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: {
        where: {
          status: { in: ['PAID', 'PENDING'] },
        },
      },
    },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  const totalPaid = order.payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const due = order.total - totalPaid;
  
  return {
    total: order.total,
    paid: totalPaid,
    due: Math.max(0, due),
    status: due <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING'),
  };
}

/**
 * Record a payment for an order
 * Validates amount and updates order payment status
 */
export async function recordPayment({
  orderId,
  amount,
  method,
  transactionId,
  gateway,
  gatewayResponse,
  notes,
  receivedBy,
  attachmentUrl,
}: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  gateway?: string;
  gatewayResponse?: any;
  notes?: string;
  receivedBy: string;
  attachmentUrl?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // Validate order exists
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: 'PAID' },
        },
        user: true,
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Calculate current paid amount
    const currentPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = order.total - currentPaid;
    
    // Validate payment amount
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }
    
    if (amount > remaining + 0.01) { // Allow 1 cent tolerance for rounding
      throw new Error(`Payment amount exceeds due amount. Remaining: ${remaining.toFixed(2)}`);
    }
    
    // Check for duplicate transaction ID
    if (transactionId) {
      const existingPayment = await tx.payment.findUnique({
        where: { transactionId },
      });
      if (existingPayment) {
        throw new Error('Duplicate transaction ID. This payment may have already been recorded.');
      }
    }
    
    // Create payment record
    const payment = await tx.payment.create({
      data: {
        orderId,
        amount,
        method,
        status: 'PAID',
        transactionId,
        gateway,
        gatewayResponse: gatewayResponse ? gatewayResponse : undefined,
        notes,
        receivedBy,
        attachmentUrl,
        paidAt: new Date(),
        confirmedAt: new Date(),
      },
    });
    
    // Update order payment status
    const newPaid = currentPaid + amount;
    const newStatus: PaymentStatus = newPaid >= order.total - 0.01 ? 'PAID' : 'PARTIAL';
    
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newStatus,
      },
    });
    
    // Log to financial ledger
    await tx.financialLedger.create({
      data: {
        sourceType: 'ORDER',
        sourceId: payment.id,
        sourceName: `Payment for order ${order.orderNumber}`,
        amount: amount,
        direction: 'CREDIT',
        category: 'REVENUE',
        description: `Payment received via ${method}${gateway ? ` (${gateway})` : ''}`,
        orderId: orderId,
        partyId: order.userId || undefined,
        partyName: order.userId ? order.user?.name : order.guestName || 'Guest',
        partyType: order.userId ? 'CUSTOMER' : 'GUEST',
        createdBy: receivedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return payment;
  });
}

/**
 * Process a refund for an order
 * Creates negative payment and updates order status
 */
export async function processRefund({
  orderId,
  amount,
  reason,
  processedBy,
  refundMethod,
}: {
  orderId: string;
  amount: number;
  reason: string;
  processedBy: string;
  refundMethod?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { 
        payments: true,
        user: true,
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const totalPaid = order.payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
    
    if (amount > totalPaid) {
      throw new Error(`Refund amount exceeds paid amount. Total paid: ${totalPaid.toFixed(2)}`);
    }
    
    if (amount <= 0) {
      throw new Error('Refund amount must be positive');
    }
    
    // Create negative payment (refund)
    const refund = await tx.payment.create({
      data: {
        orderId,
        amount: -amount, // Negative for refund
        method: (refundMethod as PaymentMethod) || 'BANK_TRANSFER',
        status: 'REFUNDED',
        notes: `REFUND: ${reason}`,
        receivedBy: processedBy,
        paidAt: new Date(),
        confirmedAt: new Date(),
      },
    });
    
    // Calculate new payment status
    const netPaid = totalPaid - amount;
    const newPaymentStatus: PaymentStatus = netPaid <= 0 ? 'REFUNDED' : (netPaid < order.total ? 'PARTIAL' : 'PAID');
    
    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: amount >= order.total ? 'REFUNDED' : order.status,
        paymentStatus: newPaymentStatus,
      },
    });
    
    // Log to financial ledger
    await tx.financialLedger.create({
      data: {
        sourceType: 'REFUND',
        sourceId: refund.id,
        sourceName: `Refund for order ${order.orderNumber}`,
        amount: amount,
        direction: 'DEBIT',
        category: 'REFUNDS',
        description: reason,
        orderId: orderId,
        partyId: order.userId || undefined,
        partyName: order.userId ? order.user?.name : order.guestName || 'Guest',
        partyType: order.userId ? 'CUSTOMER' : 'GUEST',
        createdBy: processedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return refund;
  });
}

/**
 * Get all payments for an order
 */
export async function getOrderPayments(orderId: string) {
  return await prisma.payment.findMany({
    where: { orderId },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get payment summary for a date range
 */
export async function getPaymentSummary(startDate: Date, endDate: Date) {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'PAID',
      paidAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          total: true,
        },
      },
    },
  });
  
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Group by payment method
  const byMethod: Record<string, number> = {};
  payments.forEach(p => {
    byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
  });
  
  return {
    totalReceived,
    paymentCount: payments.length,
    byMethod,
    payments,
  };
}

/**
 * Get outstanding dues across all orders
 */
export async function getOutstandingDues() {
  const orders = await prisma.order.findMany({
    where: {
      status: { 
        in: [
          OrderStatus.CONFIRMED, 
          OrderStatus.PROCESSING, 
          OrderStatus.PACKED, 
          OrderStatus.SHIPPED, 
          OrderStatus.DELIVERED, 
          OrderStatus.IN_TRANSIT
        ] 
      },
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
    },
    include: {
      payments: {
        where: { status: PaymentStatus.PAID },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  
  const dueOrders = orders.map((order) => {
    const paid = order.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const due = Math.max(0, order.total - paid);
    
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      paid,
      due,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customer: order.user ? {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
      } : {
        name: order.guestName,
        email: order.guestEmail,
      },
      createdAt: order.createdAt,
    };
  }).filter(o => o.due > 0);
  
  const totalDue = dueOrders.reduce((sum, o) => sum + o.due, 0);
  
  return {
    totalDue,
    dueCount: dueOrders.length,
    orders: dueOrders,
  };
}

/**
 * Mark order as paid (manual confirmation)
 */
export async function markOrderAsPaid({
  orderId,
  markedBy,
  notes,
}: {
  orderId: string;
  markedBy: string;
  notes?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: 'PAID' },
        },
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const currentPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = order.total - currentPaid;
    
    if (remaining <= 0) {
      throw new Error('Order is already fully paid');
    }
    
    // Create a payment for the remaining amount
    const payment = await recordPayment({
      orderId,
      amount: remaining,
      method: 'BANK_TRANSFER',
      notes: notes || 'Manually marked as paid',
      receivedBy: markedBy,
    });
    
    return payment;
  });
}
