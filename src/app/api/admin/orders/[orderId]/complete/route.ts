/**
 * Order Completion API
 * POST: Complete order delivery and finalize COGS
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { completeOrderDelivery, validateOrderForCompletion } from '@/services/orderFulfillmentService';
import { logActivity } from '@/lib/activityLogger';

/**
 * POST /api/admin/orders/[orderId]/complete
 * Complete order delivery and finalize COGS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { orderId } = await params;
    
    const body = await request.json();
    const { costingMethod = 'FIFO' } = body;
    
    // Validate costing method
    if (costingMethod !== 'FIFO' && costingMethod !== 'WAC') {
      return NextResponse.json(
        { error: 'Invalid costing method. Use FIFO or WAC' },
        { status: 400 }
      );
    }
    
    // Validate order can be completed
    const validation = await validateOrderForCompletion(orderId);
    if (!validation.canComplete) {
      return NextResponse.json(
        { 
          error: 'Order cannot be completed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }
    
    // Complete order
    const result = await completeOrderDelivery({
      orderId,
      completedBy: admin.id,
      costingMethod,
    });
    
    // Log activity
    await logActivity({
      userId: admin.id,
      userName: admin.name,
      action: 'UPDATE',
      entityType: 'Order',
      entityId: orderId,
      entityName: result.order.orderNumber,
      description: `Completed order - COGS: ${result.cogs.toFixed(2)}, Profit: ${result.grossProfit.toFixed(2)}`,
      metadata: {
        cogs: result.cogs,
        grossProfit: result.grossProfit,
        netProfit: result.netProfit,
        profitMargin: result.profitMargin,
        costingMethod,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Order completed successfully',
      order: result.order,
      financials: {
        cogs: result.cogs,
        grossProfit: result.grossProfit,
        netProfit: result.netProfit,
        profitMargin: result.profitMargin,
      },
    });
  } catch (error: any) {
    console.error('Order completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete order' },
      { status: 500 }
    );
  }
}
