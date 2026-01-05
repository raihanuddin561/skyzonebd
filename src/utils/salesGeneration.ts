import prisma from '@/lib/prisma';

/**
 * Automatically generate sales records when an order is marked as delivered
 * This should be called when order status changes to 'delivered'
 */
export async function autoGenerateSalesFromOrder(orderId: string, performedBy?: string) {
  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      console.log(`Order ${orderId} is not delivered yet. Skipping sales generation.`);
      return { success: false, message: 'Order not delivered' };
    }

    // Check if sales already exist for this order
    const existingSales = await prisma.sale.count({
      where: { orderId },
    });

    if (existingSales > 0) {
      console.log(`Sales records already exist for order ${orderId}`);
      return { success: false, message: 'Sales already exist' };
    }

    // Create sales records for each order item
    const salesData = order.orderItems.map((item) => {
      const costPrice = item.costPerUnit || item.product.costPrice || 0;
      const profitPerUnit = item.price - costPrice;
      const profitAmount = profitPerUnit * item.quantity;
      const profitMargin = item.total > 0 ? (profitAmount / item.total) * 100 : 0;

      return {
        saleType: 'ORDER_BASED' as const,
        saleDate: order.updatedAt,
        orderId: order.id,
        invoiceNumber: order.orderNumber,
        customerName: order.user?.name || order.customerName || 'Unknown',
        customerPhone: order.user?.phone || order.phone,
        customerEmail: order.user?.email || order.email,
        customerId: order.userId,
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        totalAmount: item.total,
        costPrice,
        profitAmount,
        profitMargin,
        paymentMethod: order.paymentMethod || 'Not specified',
        paymentStatus: (order.isPaid ? 'PAID' : 'PENDING') as const,
        notes: `Auto-generated from delivered order ${order.orderNumber}`,
        enteredBy: performedBy || null,
        isDelivered: true,
      };
    });

    // Create all sales records
    const sales = await prisma.sale.createMany({
      data: salesData,
    });

    console.log(`Generated ${sales.count} sales records from order ${order.orderNumber}`);

    return {
      success: true,
      message: `Generated ${sales.count} sales records`,
      salesCount: sales.count,
    };
  } catch (error) {
    console.error('Error auto-generating sales from order:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch generate sales for all delivered orders without sales
 */
export async function batchGenerateSalesFromDeliveredOrders() {
  try {
    // Get all delivered orders without sales
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'delivered',
        sales: {
          none: {},
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    console.log(`Found ${deliveredOrders.length} delivered orders without sales`);

    let successCount = 0;
    let failureCount = 0;

    // Generate sales for each order
    for (const order of deliveredOrders) {
      const result = await autoGenerateSalesFromOrder(order.id);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: true,
      message: `Processed ${deliveredOrders.length} orders`,
      successCount,
      failureCount,
    };
  } catch (error) {
    console.error('Error in batch sales generation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
