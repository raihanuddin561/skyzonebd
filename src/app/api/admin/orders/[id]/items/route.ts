import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

interface EditedItem {
  productId: string;
  quantity: number;
  price: number;
}

/**
 * PATCH /api/admin/orders/[id]/items
 * Admin adjusts quantity/price on an existing PENDING order's line items
 * (e.g. correcting a manually-placed order before confirming it). Does not
 * add or remove line items — the edited set must match the order's existing
 * lines exactly. Stock is adjusted by the quantity delta and each affected
 * line's profit fields are recomputed from its snapshotted cost.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id: orderId } = await params;
    const body = await request.json();
    const items: EditedItem[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items are required' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (
        !item.productId ||
        !Number.isFinite(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.price) || item.price < 0
      ) {
        return NextResponse.json(
          { success: false, error: 'Each item requires a valid productId, quantity (>= 1) and price (>= 0)' },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Stock has already been allocated against the original lines and, once
    // an order moves past PENDING, downstream invoicing/profit reports may
    // already reference them — so only PENDING orders can have items edited.
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot edit items on an order with status ${order.status}. Only PENDING orders can be edited.` },
        { status: 400 }
      );
    }

    const existingProductIds = new Set(order.orderItems.map(i => i.productId));
    const editedProductIds = new Set(items.map(i => i.productId));
    const sameLineSet =
      existingProductIds.size === editedProductIds.size &&
      [...existingProductIds].every(id => editedProductIds.has(id));
    if (!sameLineSet) {
      return NextResponse.json(
        { success: false, error: "Edited items must match the order's existing line items exactly — adding or removing lines is not supported here" },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

      for (const editedItem of items) {
        const orderItem = order.orderItems.find(i => i.productId === editedItem.productId)!;
        const quantityDelta = editedItem.quantity - orderItem.quantity;

        if (quantityDelta > 0) {
          // Increasing quantity consumes more stock than was originally reserved.
          const product = await tx.product.findUnique({
            where: { id: editedItem.productId },
            select: { stockQuantity: true, name: true }
          });
          const previousStock = product?.stockQuantity ?? 0;

          const result = await tx.product.updateMany({
            where: { id: editedItem.productId, stockQuantity: { gte: quantityDelta } },
            data: { stockQuantity: { decrement: quantityDelta } }
          });
          if (result.count === 0) {
            throw new Response(
              JSON.stringify({ success: false, error: `Insufficient stock for ${product?.name || editedItem.productId} to increase quantity by ${quantityDelta}` }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }

          await tx.inventoryLog.create({
            data: {
              productId: editedItem.productId,
              action: 'ADJUSTMENT',
              quantity: -quantityDelta,
              previousStock,
              newStock: previousStock - quantityDelta,
              reference: order.id,
              notes: `Order ${order.orderNumber} item quantity increased by admin (${orderItem.quantity} -> ${editedItem.quantity})`,
              performedBy: admin.id,
            }
          });
        } else if (quantityDelta < 0) {
          // Decreasing quantity releases the difference back to stock.
          const releaseQty = -quantityDelta;
          const product = await tx.product.findUnique({
            where: { id: editedItem.productId },
            select: { stockQuantity: true }
          });
          const previousStock = product?.stockQuantity ?? 0;

          await tx.product.update({
            where: { id: editedItem.productId },
            data: { stockQuantity: { increment: releaseQty } }
          });

          await tx.inventoryLog.create({
            data: {
              productId: editedItem.productId,
              action: 'ADJUSTMENT',
              quantity: releaseQty,
              previousStock,
              newStock: previousStock + releaseQty,
              reference: order.id,
              notes: `Order ${order.orderNumber} item quantity decreased by admin (${orderItem.quantity} -> ${editedItem.quantity})`,
              performedBy: admin.id,
            }
          });
        }

        const total = editedItem.quantity * editedItem.price;
        const costPerUnit = orderItem.costPerUnit || 0;
        const profitPerUnit = editedItem.price - costPerUnit;
        const totalProfit = profitPerUnit * editedItem.quantity;
        const profitMargin = total > 0 ? (totalProfit / total) * 100 : 0;

        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: {
            quantity: editedItem.quantity,
            price: editedItem.price,
            total,
            profitPerUnit,
            totalProfit,
            profitMargin,
          }
        });

        subtotal += total;
      }

      // Preserve the order's original tax ratio (tax is 0 unless an admin
      // has configured TAX_RATE) rather than re-deriving a rate here.
      const tax = order.subtotal > 0 ? (order.tax / order.subtotal) * subtotal : order.tax;
      const total = subtotal + order.shipping + tax;

      return tx.order.update({
        where: { id: orderId },
        data: { subtotal, tax, total },
        include: {
          orderItems: {
            include: { product: true }
          }
        }
      });
    });

    await logActivity({
      userId: admin.id,
      userName: admin.name,
      action: 'UPDATE',
      entityType: 'Order',
      entityId: updatedOrder.id,
      entityName: updatedOrder.orderNumber,
      description: `Admin edited order items for ${updatedOrder.orderNumber}. New total: ৳${updatedOrder.total.toFixed(2)}`,
      request
    });

    return NextResponse.json({
      success: true,
      message: 'Order items updated successfully',
      data: {
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          subtotal: updatedOrder.subtotal,
          shipping: updatedOrder.shipping,
          tax: updatedOrder.tax,
          total: updatedOrder.total,
          items: updatedOrder.orderItems.map(item => ({
            id: item.id,
            productId: item.productId,
            name: item.product.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total
          }))
        }
      }
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Update Order Items Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order items' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
