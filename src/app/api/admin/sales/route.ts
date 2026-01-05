import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// GET - Get all sales (with filters)
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const saleType = searchParams.get('saleType'); // DIRECT | ORDER_BASED
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const productId = searchParams.get('productId');
    const customerId = searchParams.get('customerId');
    const paymentStatus = searchParams.get('paymentStatus');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (saleType) {
      where.saleType = saleType;
    }
    
    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (productId) {
      where.productId = productId;
    }
    
    if (customerId) {
      where.customerId = customerId;
    }
    
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Get sales with pagination
    const [sales, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              imageUrl: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
          enteredByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          saleDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    // Calculate summary stats
    const stats = await prisma.sale.aggregate({
      where,
      _sum: {
        totalAmount: true,
        profitAmount: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    // Get sales by type
    const salesByType = await prisma.sale.groupBy({
      by: ['saleType'],
      where,
      _sum: {
        totalAmount: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sales,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
        stats: {
          totalSales: stats._count.id || 0,
          totalRevenue: stats._sum.totalAmount || 0,
          totalProfit: stats._sum.profitAmount || 0,
          totalQuantity: stats._sum.quantity || 0,
          byType: salesByType,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

// POST - Create a new direct sale
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);

    const body = await request.json();
    const {
      productId,
      quantity,
      unitPrice,
      customerName,
      customerPhone,
      customerEmail,
      customerId,
      paymentMethod,
      paymentStatus,
      notes,
      saleDate,
    } = body;

    // Validate required fields
    if (!productId || !quantity || !unitPrice || !customerName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        costPrice: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check stock availability
    if (product.stockQuantity < quantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}` 
        },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalAmount = quantity * unitPrice;
    const costPrice = product.costPrice || 0;
    const profitPerUnit = unitPrice - costPrice;
    const profitAmount = profitPerUnit * quantity;
    const profitMargin = totalAmount > 0 ? (profitAmount / totalAmount) * 100 : 0;

    // Create sale and update stock in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale record
      const newSale = await tx.sale.create({
        data: {
          saleType: 'DIRECT',
          saleDate: saleDate ? new Date(saleDate) : new Date(),
          productId,
          productName: product.name,
          productSku: product.sku,
          quantity,
          unitPrice,
          totalAmount,
          costPrice,
          profitAmount,
          profitMargin,
          customerName,
          customerPhone,
          customerEmail,
          customerId,
          paymentMethod,
          paymentStatus: paymentStatus || 'PAID',
          notes,
          enteredBy: admin.id,
          isDelivered: true, // Direct sales are delivered
        },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Update product stock
      await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: {
            decrement: quantity,
          },
        },
      });

      // Log inventory change
      await tx.inventoryLog.create({
        data: {
          productId,
          action: 'SALE',
          quantity: -quantity,
          previousStock: product.stockQuantity,
          newStock: product.stockQuantity - quantity,
          reference: `DIRECT-${newSale.id}`,
          notes: `Direct sale to ${customerName}`,
          performedBy: admin.id,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          action: 'CREATE',
          entityType: 'SALE',
          entityId: newSale.id,
          userId: admin.id,
          userName: admin.name,
          description: `Created direct sale for ${product.name}`,
          metadata: {
            saleType: 'DIRECT',
            productName: product.name,
            customerName,
            quantity,
            totalAmount,
          },
        },
      });

      return newSale;
    });

    return NextResponse.json({
      success: true,
      message: 'Sale created successfully',
      data: { sale },
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
