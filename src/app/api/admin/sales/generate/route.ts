import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { SaleType } from '@prisma/client';

// POST - Generate sales from delivered orders
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

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
                costPerUnit: true,
                basePrice: true,
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
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is delivered
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Order must be in 'DELIVERED' status. Current status: ${order.status}` 
        },
        { status: 400 }
      );
    }

    // Check if sales already exist for this order
    const existingSales = await prisma.sale.count({
      where: { orderId },
    });

    if (existingSales > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sales records already exist for this order' 
        },
        { status: 400 }
      );
    }

    // Create sales records for each order item
    const salesData = order.orderItems.map((item) => {
      const costPrice = item.costPerUnit || item.product.costPerUnit || item.product.basePrice || 0;
      const profitPerUnit = item.price - costPrice;
      const profitAmount = profitPerUnit * item.quantity;
      const profitMargin = item.total > 0 ? (profitAmount / item.total) * 100 : 0;

      return {
        saleType: SaleType.ORDER_BASED,
        saleDate: order.updatedAt, // Use order update time as sale date
        orderId: order.id,
        invoiceNumber: order.orderNumber,
        customerName: order.user?.name || order.guestName || 'Unknown',
        customerPhone: order.user?.phone || order.guestPhone || null,
        customerEmail: order.user?.email || order.guestEmail || null,
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
        paymentStatus: order.paymentStatus,
        notes: `Generated from order ${order.orderNumber}`,
        enteredBy: admin.id,
        isDelivered: true,
      };
    });

    // Create all sales records
    const sales = await prisma.sale.createMany({
      data: salesData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'CREATE',
        entityType: 'SALE',
        entityId: orderId,
        userId: admin.id,
        userName: admin.name || admin.email,
        description: `Generated ${salesData.length} sale records from order ${order.orderNumber}`,
        metadata: {
          action: 'generate_sales_from_order',
          orderNumber: order.orderNumber,
          itemCount: order.orderItems.length,
          totalRevenue: order.total,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${sales.count} sale records from order`,
      data: {
        salesCount: sales.count,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    console.error('Error generating sales from order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate sales from order' },
      { status: 500 }
    );
  }
}

// GET - Get sales statistics
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get delivered orders without sales
    const deliveredOrdersWithoutSales = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        sales: {
          none: {},
        },
        ...dateFilter,
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    });

    // Get sales statistics
    const totalSales = await prisma.sale.count({
      where: dateFilter,
    });

    const directSales = await prisma.sale.count({
      where: {
        saleType: 'DIRECT',
        ...dateFilter,
      },
    });

    const orderBasedSales = await prisma.sale.count({
      where: {
        saleType: 'ORDER_BASED',
        ...dateFilter,
      },
    });

    const revenueStats = await prisma.sale.aggregate({
      where: dateFilter,
      _sum: {
        totalAmount: true,
        profitAmount: true,
        quantity: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deliveredOrdersWithoutSales: {
          count: deliveredOrdersWithoutSales.length,
          orders: deliveredOrdersWithoutSales,
        },
        statistics: {
          totalSales,
          directSales,
          orderBasedSales,
          totalRevenue: revenueStats._sum.totalAmount || 0,
          totalProfit: revenueStats._sum.profitAmount || 0,
          totalQuantitySold: revenueStats._sum.quantity || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching sales statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
