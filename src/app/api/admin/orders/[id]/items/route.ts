import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to verify JWT and check admin role
type AuthResult = 
  | { authorized: true; userId: string; error?: never }
  | { authorized: false; userId?: never; error: string };

function verifyAdmin(request: NextRequest): AuthResult {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization token' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; role: string };

    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return { authorized: false, error: 'Admin access required' };
    }

    return { authorized: true, userId: decoded.userId };
  } catch {
    return { authorized: false, error: 'Invalid token' };
  }
}

// PATCH - Update order items (Admin only - for PENDING orders)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { items } = body; // Array of { productId, quantity, price }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Validate order exists and is in PENDING status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Only PENDING orders can be edited' },
        { status: 400 }
      );
    }

    // Validate all items
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Each item must have productId, quantity, and price' },
          { status: 400 }
        );
      }

      if (item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Quantity must be greater than 0' },
          { status: 400 }
        );
      }

      if (item.price < 0) {
        return NextResponse.json(
          { success: false, error: 'Price cannot be negative' },
          { status: 400 }
        );
      }

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }
    }

    // Calculate new totals
    let newSubtotal = 0;
    const updatedItems = [];

    // Update each order item
    for (const item of items) {
      const total = item.quantity * item.price;
      newSubtotal += total;

      // Find existing order item
      const existingItem = order.orderItems.find(oi => oi.productId === item.productId);

      if (existingItem) {
        // Update existing item
        const updatedItem = await prisma.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: item.quantity,
            price: item.price,
            total: total
          }
        });
        updatedItems.push(updatedItem);
      } else {
        // Create new item if it doesn't exist
        const newItem = await prisma.orderItem.create({
          data: {
            orderId: orderId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: total
          }
        });
        updatedItems.push(newItem);
      }
    }

    // Delete items that are not in the new items array
    const itemProductIds = items.map(i => i.productId);
    const itemsToDelete = order.orderItems.filter(oi => !itemProductIds.includes(oi.productId));
    
    for (const itemToDelete of itemsToDelete) {
      await prisma.orderItem.delete({
        where: { id: itemToDelete.id }
      });
    }

    // Calculate tax and shipping (you can adjust these calculations)
    const taxRate = 0; // 0% tax
    const newTax = newSubtotal * taxRate;
    const newShipping = order.shipping; // Keep existing shipping
    const newTotal = newSubtotal + newTax + newShipping;

    // Update order totals
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        updatedAt: new Date()
      },
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
        }
      }
    });

    // Format response
    const formattedOrder = {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      items: updatedOrder.orderItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        imageUrl: item.product.imageUrl,
        sku: item.product.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.total
      })),
      subtotal: updatedOrder.subtotal,
      shipping: updatedOrder.shipping,
      tax: updatedOrder.tax,
      total: updatedOrder.total,
      updatedAt: updatedOrder.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: formattedOrder,
      message: 'Order items updated successfully'
    });

  } catch (error) {
    console.error('Update Order Items Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order items' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
