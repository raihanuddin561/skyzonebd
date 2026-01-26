/**
 * Order Payments API
 * POST: Record payment for order
 * GET: Get payments and due information for order
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { recordPayment, calculateOrderDue, getOrderPayments } from '@/services/paymentService';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * POST /api/admin/orders/[orderId]/payments
 * Record a payment for an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { orderId } = await params;
    
    const body = await request.json();
    const {
      amount,
      method,
      transactionId,
      gateway,
      notes,
      attachmentUrl,
    } = body;
    
    // Validation
    if (!amount || !method) {
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      );
    }
    
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero' },
        { status: 400 }
      );
    }
    
    // Record payment
    const payment = await recordPayment({
      orderId,
      amount: parseFloat(amount),
      method,
      transactionId,
      gateway,
      notes,
      receivedBy: admin.id,
      attachmentUrl,
    });
    
    // Get updated due info
    const dueInfo = await calculateOrderDue(orderId);
    
    // Log activity
    await logActivity({
      userId: admin.id,
      userName: admin.name,
      action: 'CREATE',
      entityType: 'Payment',
      entityId: payment.id,
      entityName: `Payment for order ${orderId}`,
      description: `Recorded payment of ${amount} via ${method}`,
      metadata: { orderId, amount, method, dueInfo },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      dueInfo,
    });
  } catch (error: any) {
    console.error('Payment recording error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders/[orderId]/payments
 * Get order payments and due amount
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin(request);
    const { orderId } = await params;
    
    // Get due info
    const dueInfo = await calculateOrderDue(orderId);
    
    // Get all payments
    const payments = await getOrderPayments(orderId);
    
    return NextResponse.json({
      success: true,
      dueInfo,
      payments,
    });
  } catch (error: any) {
    console.error('Failed to fetch payment data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
}
