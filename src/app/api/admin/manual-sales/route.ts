import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verify, JwtPayload } from 'jsonwebtoken';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

// GET /api/admin/manual-sales - List all manual sales entries
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;
    try {
      decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only admins can access
    if (!['ADMIN', 'SUPER_ADMIN'].includes(decoded.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const saleType = searchParams.get('saleType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId');

    // Build where clause
    const where: any = {};
    
    if (saleType) {
      where.saleType = saleType;
    }
    
    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    if (customerId) {
      where.customerId = customerId;
    }

    // Get total count
    const total = await prisma.manualSalesEntry.count({ where });

    // Get paginated results
    const entries = await prisma.manualSalesEntry.findMany({
      where,
      include: {
        items: {
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
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true
          }
        },
        enteredByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        saleDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching manual sales:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manual sales entries' },
      { status: 500 }
    );
  }
}

// POST /api/admin/manual-sales - Create new manual sales entry
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;
    try {
      decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only admins can create
    if (!['ADMIN', 'SUPER_ADMIN'].includes(decoded.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      saleDate,
      referenceNumber,
      saleType,
      customerId,
      customerName,
      customerPhone,
      customerCompany,
      items,
      discount,
      tax,
      shipping,
      paymentMethod,
      paymentStatus,
      amountPaid,
      adjustInventory,
      notes,
      attachments
    } = body;

    // Validate required fields
    if (!saleDate || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sale date and items are required' },
        { status: 400 }
      );
    }

    // Validate products exist and have sufficient stock
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0 || !item.unitPrice || item.unitPrice <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each item must have productId, quantity > 0, and unitPrice > 0' },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          costPerUnit: true,
          basePrice: true
        }
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      if (adjustInventory && product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    let subtotal = 0;
    let totalCost = 0;
    
    const itemsData = await Promise.all(items.map(async (item: any) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          name: true,
          sku: true,
          costPerUnit: true,
          basePrice: true
        }
      });

      const costPerUnit = item.costPerUnit || product?.costPerUnit || product?.basePrice || 0;
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      const itemTotal = itemSubtotal - itemDiscount;
      const itemTotalCost = item.quantity * costPerUnit;
      const itemProfit = itemTotal - itemTotalCost;
      const itemProfitMargin = itemTotal > 0 ? (itemProfit / itemTotal) * 100 : 0;

      subtotal += itemSubtotal;
      totalCost += itemTotalCost;

      return {
        productId: item.productId,
        productName: product?.name || 'Unknown Product',
        productSku: product?.sku || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPerUnit: costPerUnit,
        subtotal: itemSubtotal,
        discount: itemDiscount,
        total: itemTotal,
        totalCost: itemTotalCost,
        profit: itemProfit,
        profitMargin: itemProfitMargin,
        notes: item.notes || null
      };
    }));

    const discountAmount = discount || 0;
    const taxAmount = tax || 0;
    const shippingAmount = shipping || 0;
    const total = subtotal - discountAmount + taxAmount + shippingAmount;
    const totalProfit = total - totalCost;
    const profitMargin = total > 0 ? (totalProfit / total) * 100 : 0;

    // Create manual sales entry in transaction
    const entry = await prisma.$transaction(async (tx) => {
      // Create the sales entry
      const newEntry = await tx.manualSalesEntry.create({
        data: {
          saleDate: new Date(saleDate),
          referenceNumber: referenceNumber || null,
          saleType: saleType || 'OFFLINE',
          customerId: customerId || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerCompany: customerCompany || null,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          shipping: shippingAmount,
          total,
          totalCost,
          totalProfit,
          profitMargin,
          paymentMethod: paymentMethod || null,
          paymentStatus: paymentStatus || 'PAID',
          amountPaid: amountPaid || total,
          adjustInventory: adjustInventory !== false,
          notes: notes || null,
          attachments: attachments || [],
          enteredBy: decoded.userId,
          items: {
            create: itemsData
          }
        },
        include: {
          items: {
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
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Adjust inventory if requested
      if (adjustInventory !== false) {
        for (const item of items) {
          // Fetch product for previous stock value
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stockQuantity: true }
          });

          if (!product) continue;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          });

          // Create inventory log
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              action: 'SALE',
              quantity: -item.quantity,
              previousStock: product.stockQuantity,
              newStock: product.stockQuantity - item.quantity,
              reference: newEntry.id,
              notes: `Manual sale entry: ${referenceNumber || newEntry.id}`,
              performedBy: decoded.userId
            }
          });
        }

        // Mark inventory as adjusted
        await tx.manualSalesEntry.update({
          where: { id: newEntry.id },
          data: { inventoryAdjusted: true }
        });
      }

      // Create financial ledger entry
      await tx.financialLedger.create({
        data: {
          sourceType: 'MANUAL_SALE',
          sourceId: newEntry.id,
          sourceName: `Manual Sale: ${referenceNumber || newEntry.id}`,
          amount: total,
          direction: 'CREDIT',
          category: 'REVENUE',
          subcategory: saleType || 'OFFLINE',
          partyId: customerId || null,
          partyName: customerName || null,
          partyType: customerId ? 'CUSTOMER' : 'GUEST',
          description: `Manual sales entry - ${itemsData.length} items`,
          notes: notes || null,
          metadata: {
            referenceNumber,
            itemCount: itemsData.length,
            profitMargin: profitMargin.toFixed(2),
            totalProfit: totalProfit.toFixed(2)
          },
          createdBy: decoded.userId
        }
      });

      return newEntry;
    });

    // Log activity
    await logActivity({
      userId: decoded.userId,
      userName: decoded.name || 'Admin',
      action: 'CREATE',
      entityType: 'MANUAL_SALE',
      entityId: entry.id,
      entityName: `Sale ${referenceNumber || entry.saleDate}`,
      description: `Created manual sale entry for ${entry.total.toLocaleString()} BDT with ${entry.items.length} items`,
      request
    });

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Manual sales entry created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating manual sales entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create manual sales entry' },
      { status: 500 }
    );
  }
}
