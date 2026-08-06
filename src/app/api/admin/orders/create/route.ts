import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { depleteStockLotsForSale } from '@/services/inventoryService';
import { alertIfCrossedReorderLevel } from '@/utils/lowStockAlerts';
import { getPaymentTermsForMethod, checkCreditLimit, createInvoiceForOrder } from '@/services/invoiceService';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// Generate unique order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// POST - Admin creates order manually
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);

    const body = await request.json();
    const {
      customerId,
      items, // Array of { productId, quantity, customPrice? }
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes,
      shipping = 0,
      tax = 0,
      status = 'PENDING'
    } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !billingAddress) {
      return NextResponse.json(
        { success: false, error: 'Shipping and billing addresses are required' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Verify customer if provided
    let customer = null;
    let customerDiscount = 0;
    
    if (customerId) {
      customer = await prisma.user.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          discountPercent: true,
          discountValidUntil: true
        }
      });

      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
      
      // Apply customer discount if valid
      if (customer.discountPercent && customer.discountPercent > 0) {
        if (!customer.discountValidUntil || customer.discountValidUntil > new Date()) {
          customerDiscount = customer.discountPercent;

        }
      }
    }

    // Validate and calculate items
    let subtotal = 0;
    const orderItemsData: Array<{
      productId: string;
      quantity: number;
      price: number;
      total: number;
      costPerUnit: number;
      profitPerUnit: number;
      totalProfit: number;
      profitMargin: number;
      productName: string;
      productSku: string | null;
      reorderLevel: number | null;
    }> = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid item data' },
          { status: 400 }
        );
      }

      // Get product details
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          reorderLevel: true,
          wholesalePrice: true,
          stockQuantity: true,
          basePrice: true,
          costPerUnit: true,
          platformProfitPercentage: true
        }
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      // Check stock availability
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }

      // Determine price: custom price > product wholesale price
      let itemPrice = product.wholesalePrice;
      
      if (item.customPrice !== undefined && item.customPrice !== null) {
        // Admin provided custom price for this order
        itemPrice = item.customPrice;
      }
      
      // Apply customer discount to the item price if no custom price
      if (item.customPrice === undefined && customerDiscount > 0) {
        itemPrice = itemPrice * (1 - customerDiscount / 100);
      }

      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      // Calculate profit metrics (snapshot at order time)
      const costPerUnit = product.costPerUnit || product.basePrice;
      const profitPerUnit = itemPrice - costPerUnit;
      const totalProfit = profitPerUnit * item.quantity;
      const profitMargin = itemTotal > 0 ? (totalProfit / itemTotal) * 100 : 0;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        total: itemTotal,
        // Snapshot profit configuration
        costPerUnit: costPerUnit,
        profitPerUnit: profitPerUnit,
        totalProfit: totalProfit,
        profitMargin: profitMargin,
        productName: product.name,
        productSku: product.sku,
        reorderLevel: product.reorderLevel
      });
    }

    const total = subtotal + shipping + tax;

    // NET30/60/90 orders get a real Invoice + credit-limit check (Amazon-
    // style gap-closure Phase 2 part 3) — applies only to invoice-on-
    // credit payment methods, not prepaid/cash ones. NET terms require an
    // identified customer: there's no BusinessInfo/credit history to
    // check for a no-customer manual order.
    const netTerms = getPaymentTermsForMethod(paymentMethod);
    if (netTerms && !customerId) {
      return NextResponse.json(
        { success: false, error: 'NET payment terms require a customer to be selected' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Collects stock-crossing candidates during the transaction below, for
    // a best-effort, non-blocking low-stock alert fired after it commits
    // (Amazon-style gap-closure Phase 1).
    const stockAlertCandidates: Array<{ product: { id: string; name: string; sku: string | null; reorderLevel: number | null }; previousStock: number; newStock: number }> = [];

    // Create order, update stock, and log activity in a single transaction
    const order: any = await prisma.$transaction(async (tx) => {
      if (netTerms) {
        const creditCheck = await checkCreditLimit(customerId, total, tx);
        if (!creditCheck.allowed) {
          throw new Response(
            JSON.stringify({
              success: false,
              error: `This order would exceed the customer's credit limit (outstanding: ${creditCheck.outstandingBalance}, limit: ${creditCheck.creditLimit})`,
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: customerId || null,
          subtotal,
          tax,
          shipping,
          total,
          status,
          paymentStatus: 'PENDING',
          paymentMethod,
          paymentTerms: netTerms || undefined,
          shippingAddress,
          billingAddress,
          notes,
          orderItems: {
            create: orderItemsData.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              costPerUnit: item.costPerUnit,
              profitPerUnit: item.profitPerUnit,
              totalProfit: item.totalProfit,
              profitMargin: item.profitMargin
            }))
          }
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

      // Update stock quantities. Guarded the same way as the customer-facing
      // checkout (orders/route.ts) — this file previously used a plain
      // `update` with no `stockQuantity: { gte }` guard, the exact
      // check-then-act race already found and fixed elsewhere (Production
      // Readiness Audit, 2026-07-18) but missed here at the time. Also
      // deplete real stock lots for WAC-accurate COGS and record the
      // movement in InventoryLog (Amazon-style gap-closure Phase 1).
      for (const item of orderItemsData) {
        const existingStock = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        const previousStock = existingStock?.stockQuantity ?? 0;

        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantity: { gte: item.quantity }
          },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });
        if (result.count === 0) {
          throw new Error(`Insufficient stock for product ${item.productId} (concurrent order consumed the remaining units)`);
        }

        stockAlertCandidates.push({
          product: { id: item.productId, name: item.productName, sku: item.productSku, reorderLevel: item.reorderLevel },
          previousStock,
          newStock: previousStock - item.quantity,
        });

        const orderItem = newOrder.orderItems.find((oi: any) => oi.productId === item.productId);
        if (orderItem) {
          const { costPerUnit: wacCostPerUnit } = await depleteStockLotsForSale(tx, {
            productId: item.productId,
            quantity: item.quantity,
            orderId: newOrder.id,
            orderItemId: orderItem.id,
          });

          if (wacCostPerUnit !== null && wacCostPerUnit !== orderItem.costPerUnit) {
            const profitPerUnit = orderItem.price - wacCostPerUnit;
            const totalProfit = profitPerUnit * orderItem.quantity;
            const profitMargin = orderItem.total > 0 ? (totalProfit / orderItem.total) * 100 : 0;

            await tx.orderItem.update({
              where: { id: orderItem.id },
              data: { costPerUnit: wacCostPerUnit, profitPerUnit, totalProfit, profitMargin },
            });
          }
        }

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'SALE',
            quantity: -item.quantity,
            previousStock,
            newStock: previousStock - item.quantity,
            reference: newOrder.id,
            notes: `Admin-created order ${newOrder.orderNumber}`,
            performedBy: auth.id,
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: auth.id,
          userName: 'Admin',
          action: 'CREATE',
          entityType: 'Order',
          entityId: newOrder.id,
          entityName: newOrder.orderNumber,
          description: `Manually created order ${newOrder.orderNumber}${customer ? ` for ${customer.name}` : ''}`,
          metadata: {
            customerId: customerId,
            itemCount: items.length,
            total: total
          }
        }
      });

      if (netTerms) {
        await createInvoiceForOrder(
          { orderId: newOrder.id, customerId: customerId, amount: total, paymentTerms: netTerms },
          tx
        );
      }

      return newOrder;
    });

    // Best-effort, non-blocking low-stock alerts, fired after the
    // transaction has committed (Amazon-style gap-closure Phase 1).
    for (const candidate of stockAlertCandidates) {
      await alertIfCrossedReorderLevel(candidate.product, candidate.previousStock, candidate.newStock);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.userId,
        customerName: customer?.name,
        items: (order.orderItems).map((item: any) => ({
          productId: item.productId,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      },
      message: 'Order created successfully'
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Create Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
