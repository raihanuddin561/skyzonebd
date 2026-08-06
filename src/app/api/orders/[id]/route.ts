import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoGenerateProfitReport } from '@/utils/profitReportGeneration';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { logInfo, logError } from '@/lib/logger';
import { releaseStockAllocationsForOrder } from '@/services/inventoryService';
import { emailService } from '@/lib/email';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// GET - Get single order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                sku: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Guest orders (no linked account — order.userId is null) are readable
    // by anyone holding the order id, since there is no account to
    // authenticate against; this is how guest-checkout customers view their
    // own order today. Orders placed by a registered user require the
    // requester to be that user or an admin — this order previously had no
    // auth check at all, leaking customer PII to anyone with the order id.
    if (order.userId) {
      const authUser = await requireAuth(request);
      const isOwner = order.userId === authUser.id;
      if (!isOwner && !isAdmin(authUser.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: 'You are not authorized to view this order' },
          { status: 403 }
        );
      }
    }

    // Format response
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      guestInfo: order.guestName ? {
        name: order.guestName,
        email: order.guestEmail,
        mobile: order.guestPhone
      } : null,
      items: order.orderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        imageUrl: item.product.imageUrl,
        sku: item.product.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.total
      })),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: formattedOrder
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Get Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Update order status (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();

    // Validate order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order
    const updateData: any = {};
    
    if (body.status) {
      updateData.status = body.status.toUpperCase();
    }
    
    if (body.paymentStatus) {
      updateData.paymentStatus = body.paymentStatus.toUpperCase();
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        user: {
          select: { email: true }
        }
      }
    });

    // Auto-generate profit report if order is now DELIVERED
    if (updateData.status === 'DELIVERED' && existingOrder.status !== 'DELIVERED') {
      const profitResult = await autoGenerateProfitReport(updatedOrder.id);
      if (profitResult.success) {
        if (profitResult.ledgerPosted === false) {
          logError(profitResult.message, new Error('Ledger posting failed'), 'Orders API');
        } else {
          logInfo(profitResult.message, 'Orders API');
        }
      } else {
        logError(`Profit report generation did not succeed for order ${updatedOrder.id}`, new Error(profitResult.message), 'Orders API');
      }
    }

    // Best-effort shipped/delivered notification email (Amazon-style
    // gap-closure Phase 4 part 1) — same transition-detection idiom as the
    // DELIVERED -> autoGenerateProfitReport hook above.
    if (
      (updateData.status === 'SHIPPED' && existingOrder.status !== 'SHIPPED') ||
      (updateData.status === 'DELIVERED' && existingOrder.status !== 'DELIVERED')
    ) {
      const recipientEmail = updatedOrder.user?.email || updatedOrder.guestEmail;
      if (recipientEmail) {
        const emailResult = await emailService.sendOrderStatusUpdate(recipientEmail, updatedOrder.orderNumber, updateData.status);
        if (!emailResult.success) {
          console.error(`Order status email failed for order ${updatedOrder.orderNumber}: ${emailResult.error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        updatedAt: updatedOrder.updatedAt.toISOString()
      },
      message: 'Order updated successfully'
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Update Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);

    const { id } = await params;

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // If order is already shipped or delivered, don't allow cancellation
    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel shipped or delivered orders' },
        { status: 400 }
      );
    }

    // Restore stock and update the order status atomically. The previous
    // read-then-write (`findUnique` then `stockQuantity: product.stockQuantity
    // + item.quantity`) was both non-atomic (a failure partway through a
    // multi-item order left some products restored and others not, with the
    // order never marked cancelled) and race-prone (two concurrent
    // cancellations could read the same stale stockQuantity and lose an
    // update). Atomic `increment` inside one transaction fixes both.
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        const productBeforeRestore = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        const previousStock = productBeforeRestore?.stockQuantity ?? 0;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } }
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'ADJUSTMENT',
            quantity: item.quantity,
            previousStock,
            newStock: previousStock + item.quantity,
            reference: id,
            notes: `Stock restored from cancelled order ${order.orderNumber}`,
            performedBy: admin.id,
          },
        });
      }

      // Release any stock-lot allocations this order consumed (Amazon-style
      // gap-closure Phase 1) — see orders/cancel/route.ts for the same fix.
      await releaseStockAllocationsForOrder(tx, id);

      return tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        id: cancelledOrder.id,
        orderNumber: cancelledOrder.orderNumber,
        status: cancelledOrder.status
      },
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Cancel Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
