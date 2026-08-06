import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { getJwtSecret, requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/prisma';
import { autoGenerateProfitReport } from '@/utils/profitReportGeneration';
import { calculateItemPrice, validateCustomerDiscount } from '@/utils/pricingEngine';
import { emailService } from '@/lib/email';
import { logInfo, logError } from '@/lib/logger';
import { depleteStockLotsForSale } from '@/services/inventoryService';
import { alertIfCrossedReorderLevel } from '@/utils/lowStockAlerts';
import { getPaymentTermsForMethod, checkCreditLimit, createInvoiceForOrder } from '@/services/invoiceService';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      items, 
      shippingAddress, 
      billingAddress, 
      paymentMethod, 
      notes,
      paymentReference, // Transaction ID for manual payments (bKash, Bank Transfer)
      // Guest checkout fields
      guestInfo
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !billingAddress || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Shipping address, billing address, and payment method are required' },
        { status: 400 }
      );
    }

    // Validate payment reference for manual payment methods
    const manualPaymentMethods = ['bkash', 'bank_transfer'];
    if (manualPaymentMethods.includes(paymentMethod.toLowerCase())) {
      if (!paymentReference || paymentReference.trim().length < 5) {
        return NextResponse.json(
          { success: false, error: 'Transaction ID / Reference number is required for this payment method (minimum 5 characters)' },
          { status: 400 }
        );
      }
    }

    let userId = null;
    let guestData = null;
    let customerDiscount = 0; // Customer's special discount percentage
    let user = null; // Store user info for later use

    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = verify(token, getJwtSecret()) as DecodedToken;
        userId = decoded.userId;
        
        // Get customer discount if user is logged in
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: { 
            discountPercent: true,
            discountValidUntil: true,
            discountReason: true
          }
        });
        
        // Apply discount if valid
        if (user && user.discountPercent && user.discountPercent > 0) {
          // Check if discount has not expired
          if (!user.discountValidUntil || user.discountValidUntil > new Date()) {
            customerDiscount = user.discountPercent;
          }
        }
      } catch {
        // Token invalid, treat as guest order
      }
    }

    // For guest checkout, validate guest info
    if (!userId) {
      if (!guestInfo || !guestInfo.name || !guestInfo.mobile) {
        return NextResponse.json(
          { success: false, error: 'Guest name and mobile number are required' },
          { status: 400 }
        );
      }
      guestData = {
        name: guestInfo.name,
        email: guestInfo.email || null,
        mobile: guestInfo.mobile,
        companyName: guestInfo.companyName || null
      };
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;
    
    // SERVER-SIDE PRICING ENFORCEMENT
    // Fetch all products with tiers and recalculate prices using pricing engine
    const productDataMap = new Map();
    const pricingResults = [];
    
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId.toString() },
        select: {
          id: true,
          name: true,
          sku: true,
          reorderLevel: true,
          wholesalePrice: true,
          moq: true,
          stockQuantity: true,
          basePrice: true,
          costPerUnit: true,
          platformProfitPercentage: true,
          wholesaleTiers: {
            orderBy: { minQuantity: 'asc' }
          }
        }
      });
      
      if (!product) {
        console.error(`❌ Product not found in database: ${item.productId}`);
        const isNumericId = typeof item.productId === 'number' || !isNaN(Number(item.productId));
        const errorMsg = isNumericId 
          ? 'Your cart contains outdated product references. Please clear your cart and add products again.'
          : `Product with ID ${item.productId} not found in database`;
        
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 400 }
        );
      }
      
      // Check stock availability
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }
      
      // Validate customer discount
      const discountValidation = validateCustomerDiscount(
        customerDiscount || 0,
        user?.discountValidUntil || null
      );
      
      // Calculate correct price using pricing engine (SERVER IS SOURCE OF TRUTH)
      const priceInfo = calculateItemPrice({
        product: {
          id: product.id,
          name: product.name,
          wholesalePrice: product.wholesalePrice,
          moq: product.moq || 1, // Default to 1 if not set
          wholesaleTiers: product.wholesaleTiers.map(tier => ({
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            price: tier.price,
            discount: tier.discount,
            profitMargin: tier.profitMargin ?? undefined
          }))
        },
        quantity: item.quantity,
        customerDiscount: discountValidation.applicablePercent,
        customerDiscountValid: discountValidation.isValid
      });
      
      if (!priceInfo.meetsMinimum) {
        return NextResponse.json(
          { 
            success: false, 
            error: `${product.name} does not meet minimum order quantity of ${priceInfo.minimumRequired} units` 
          },
          { status: 400 }
        );
      }
      
      productDataMap.set(item.productId.toString(), {
        product,
        priceInfo
      });
      
      pricingResults.push(priceInfo);
    }
    
    // Calculate order totals using pricing engine results
    const subtotal = pricingResults.reduce((sum, info) => sum + info.subtotalBeforeDiscount, 0);
    const totalCustomerDiscount = pricingResults.reduce((sum, info) => sum + info.customerDiscountAmount, 0);
    const subtotalAfterDiscount = pricingResults.reduce((sum, info) => sum + info.finalTotal, 0);
    
    // Only add charges if configured by admin (via env vars)
    const shippingCharge = process.env.SHIPPING_CHARGE ? parseFloat(process.env.SHIPPING_CHARGE) : 0;
    const taxRate = process.env.TAX_RATE ? parseFloat(process.env.TAX_RATE) : 0;
    
    const shipping = shippingCharge;
    const tax = subtotalAfterDiscount * taxRate;
    const total = subtotalAfterDiscount + shipping + tax;

    // NET30/60/90 orders get a real Invoice + credit-limit check (Amazon-
    // style gap-closure Phase 2 part 3) — applies only to invoice-on-
    // credit payment methods, not prepaid/cash ones, per the confirmed
    // scope decision. NET terms require a registered account: there's no
    // BusinessInfo/credit history to check for a guest.
    const netTerms = getPaymentTermsForMethod(paymentMethod);
    if (netTerms && !userId) {
      return NextResponse.json(
        { success: false, error: 'NET payment terms require a registered account — please sign in or choose another payment method' },
        { status: 400 }
      );
    }

    // Collects stock-crossing candidates during the transaction below, so a
    // low-stock alert email (best-effort, non-blocking) can be sent AFTER
    // the transaction commits — never inside it (Amazon-style gap-closure
    // Phase 1).
    const stockAlertCandidates: Array<{ product: { id: string; name: string; sku: string | null; reorderLevel: number | null }; previousStock: number; newStock: number }> = [];

    // Create order in database and deduct stock in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      // Determine payment status based on payment method
      const manualPaymentMethods = ['bkash', 'bank_transfer'];
      const isManualPayment = manualPaymentMethods.includes(paymentMethod.toLowerCase());
      const initialPaymentStatus: 'PENDING_VERIFICATION' | 'PENDING' = isManualPayment ? 'PENDING_VERIFICATION' : 'PENDING';

      // Enforce the customer's credit limit before creating a NET-terms
      // order (Amazon-style gap-closure Phase 2 part 3) — checked inside
      // the transaction so two concurrent NET-terms orders from the same
      // customer can't both pass the check and together exceed the limit.
      if (netTerms) {
        const creditCheck = await checkCreditLimit(userId!, total, tx);
        if (!creditCheck.allowed) {
          throw new Response(
            JSON.stringify({
              success: false,
              error: `This order would exceed your credit limit (outstanding: ${creditCheck.outstandingBalance}, limit: ${creditCheck.creditLimit}) — please clear outstanding invoices or choose another payment method`,
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create order with order items
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId || undefined,
          guestName: guestData?.name,
          guestEmail: guestData?.email,
          guestPhone: guestData?.mobile,
          subtotal,
          tax,
          shipping,
          total,
          status: 'PENDING',
          paymentStatus: initialPaymentStatus as any,
          paymentMethod,
          paymentReference: (paymentReference || undefined) as any,
          paymentTerms: netTerms || undefined,
          shippingAddress,
          billingAddress,
          notes: notes || undefined,
          orderItems: {
            create: items.map((item: OrderItem) => {
              const data = productDataMap.get(item.productId.toString());
              const { product, priceInfo } = data;
              
              // Calculate profit based on ACTUAL final price
              const costPerUnit = product.costPerUnit || product.basePrice || 0;
              const profitPerUnit = priceInfo.finalUnitPrice - costPerUnit;
              const totalProfit = profitPerUnit * item.quantity;
              const profitMargin = priceInfo.finalTotal > 0 
                ? (totalProfit / priceInfo.finalTotal) * 100 
                : 0;
              
              return {
                productId: item.productId.toString(),
                quantity: item.quantity,
                price: priceInfo.finalUnitPrice, // Use calculated price, not client price
                total: priceInfo.finalTotal,
                // Snapshot profit configuration (HIDDEN FROM CUSTOMERS)
                costPerUnit: costPerUnit,
                profitPerUnit: profitPerUnit,
                totalProfit: totalProfit,
                profitMargin: profitMargin,
              };
            })
          }
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          user: {
            select: { email: true }
          }
        }
      });

      // Deduct stock for each ordered item. The sufficiency check above (in
      // `productDataMap`'s construction) reads stock before this transaction
      // opens, so two concurrent checkouts for the last few units of a
      // product could both pass that check and both reach this decrement —
      // Prisma's atomic `decrement` keeps the arithmetic correct but does
      // not, by itself, stop the value from crossing zero. Guarding the
      // update's `where` with `stockQuantity: { gte: quantity }` and
      // checking the affected row count makes this the actual point that
      // prevents overselling: if a concurrent request already consumed the
      // remaining stock, `count` is 0 here and the whole transaction (and
      // therefore the order) is rolled back rather than committing with
      // negative stock (Production Readiness Audit, 2026-07-18).
      for (const item of items) {
        const productIdStr = item.productId.toString();
        const existingStock = await tx.product.findUnique({
          where: { id: productIdStr },
          select: { stockQuantity: true },
        });
        const previousStock = existingStock?.stockQuantity ?? 0;

        const result = await tx.product.updateMany({
          where: {
            id: productIdStr,
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

        const { product: productForAlert } = productDataMap.get(productIdStr);
        stockAlertCandidates.push({
          product: { id: productForAlert.id, name: productForAlert.name, sku: productForAlert.sku, reorderLevel: productForAlert.reorderLevel },
          previousStock,
          newStock: previousStock - item.quantity,
        });

        // Deplete real stock lots for accurate Weighted-Average-Cost COGS
        // (Amazon-style gap-closure Phase 1) — falls back to the flat
        // snapshotted cost already stored on the order item if this
        // product has no lot history yet (e.g. never restocked through
        // the lot-tracked restock endpoint), so existing products behave
        // exactly as before until they're restocked with real lot data.
        const orderItem = newOrder.orderItems.find(oi => oi.productId === productIdStr);
        if (orderItem) {
          const { costPerUnit: wacCostPerUnit } = await depleteStockLotsForSale(tx, {
            productId: productIdStr,
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
            productId: productIdStr,
            action: 'SALE',
            quantity: -item.quantity,
            previousStock,
            newStock: previousStock - item.quantity,
            reference: newOrder.id,
            notes: `Order ${newOrder.orderNumber}`,
            performedBy: userId || undefined,
          },
        });
      }

      if (netTerms) {
        await createInvoiceForOrder(
          { orderId: newOrder.id, customerId: userId!, amount: total, paymentTerms: netTerms },
          tx
        );
      }

      return newOrder;
    });

    // Best-effort, non-blocking low-stock alerts — fired after the
    // transaction has committed, never inside it (Amazon-style gap-closure
    // Phase 1).
    for (const candidate of stockAlertCandidates) {
      await alertIfCrossedReorderLevel(candidate.product, candidate.previousStock, candidate.newStock);
    }

    // Log order creation activity
    const isManualPayment = ['bkash', 'bank_transfer'].includes(paymentMethod.toLowerCase());
    const paymentInfo = isManualPayment ? ` | Payment: ${paymentMethod.toUpperCase()} (TrxID: ${paymentReference}) - Pending Verification` : '';
    
    await logActivity({
      userId: userId || 'guest',
      userName: guestData?.name || 'Customer',
      action: 'CREATE',
      entityType: 'Order',
      entityId: order.id,
      entityName: order.orderNumber,
      description: `Order created for ${items.length} items. Total: ৳${total.toFixed(2)}${customerDiscount > 0 ? ` (${customerDiscount}% customer discount applied)` : ''}${paymentInfo}`
    });

    // Send an order-confirmation email — best-effort: emailService never
    // throws (it returns { success, error }), but a failure here still
    // must not fail an order that was already committed to the database.
    const recipientEmail = order.user?.email || guestData?.email;
    if (recipientEmail) {
      const emailResult = await emailService.sendOrderConfirmation(
        recipientEmail,
        order.orderNumber,
        order.total,
        order.orderItems.map(item => ({ name: item.product.name, quantity: item.quantity, price: item.price }))
      );
      if (!emailResult.success) {
        console.error(`Order confirmation email failed for order ${order.orderNumber}: ${emailResult.error}`);
      }
    }

    // Format response to match frontend expectations
    const responseOrder = {
      id: order.id,
      orderId: order.orderNumber,
      userId: order.userId,
      guestInfo: guestData,
      items: items.map((item: OrderItem) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      })),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      status: order.status.toLowerCase(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        order: responseOrder,
        message: 'Order placed successfully'
      }
    }, { status: 201 });

  } catch (error) {
    // A guarded update/credit-limit check inside the transaction throws a
    // pre-built Response to abort with the right status/message (the same
    // pattern this file's other handlers already use below) — surface it
    // as-is instead of collapsing it into a generic 500.
    if (error instanceof Response) {
      return error;
    }
    console.error('Create Order API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;
    try {
      decoded = verify(token, getJwtSecret()) as DecodedToken;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const userId = decoded.userId;
    const userRole = decoded.role.toLowerCase(); // Case-insensitive role check

    let dbOrders;
    // If admin, return all orders
    if (userRole === 'admin' || userRole === 'super_admin') {
      dbOrders = await prisma.order.findMany({
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Get user's orders only
      dbOrders = await prisma.order.findMany({
        where: {
          userId: userId
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    // Format orders to match frontend expectations
    const orders = dbOrders.map(order => ({
      id: order.id,
      orderId: order.orderNumber,
      userId: order.userId,
      guestInfo: order.guestName ? {
        name: order.guestName,
        email: order.guestEmail,
        mobile: order.guestPhone
      } : null,
      items: order.orderItems.map(item => ({
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
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Get Orders API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Canonical auth (ADR-009 / P2-9): previously a hand-rolled JWT decode +
    // `role.toUpperCase() !== 'ADMIN'` check that excluded SUPER_ADMIN.
    // requireAdmin() correctly treats SUPER_ADMIN as admin-or-higher
    // (docs/architecture-review/14_Technical_Debt.md §22). This handler has
    // no live frontend caller today (admin/orders/page.tsx uses
    // PATCH /api/orders/[id] instead) but is exported and reachable.
    const decoded = await requireAdmin(request);

    const body = await request.json();
    const { orderId, status, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate status values
    const validOrderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED'];

    if (status && !validOrderStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid order status' },
        { status: 400 }
      );
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment status' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
      paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
    } = {};
    if (status) updateData.status = status.toUpperCase() as 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    if (paymentStatus) updateData.paymentStatus = paymentStatus.toUpperCase() as 'PENDING' | 'PAID' | 'FAILED';

    // Get current order state before update
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, status: true, paymentStatus: true }
    });

    if (!currentOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        user: {
          select: { email: true }
        }
      }
    });

    // Get admin user info for logging
    const admin = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { name: true }
    });

    // Log status change activity
    const changes: string[] = [];
    if (status && currentOrder.status !== updateData.status) {
      changes.push(`Order status: ${currentOrder.status} → ${updateData.status}`);
    }
    if (paymentStatus && currentOrder.paymentStatus !== updateData.paymentStatus) {
      changes.push(`Payment status: ${currentOrder.paymentStatus} → ${updateData.paymentStatus}`);
    }

    if (changes.length > 0) {
      await logActivity({
        userId: decoded.id,
        userName: admin?.name || 'Admin',
        action: 'STATUS_CHANGE',
        entityType: 'Order',
        entityId: updatedOrder.id,
        entityName: updatedOrder.orderNumber,
        description: `Updated order ${updatedOrder.orderNumber}: ${changes.join(', ')}`,
        metadata: {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          oldStatus: currentOrder.status,
          newStatus: updatedOrder.status,
          oldPaymentStatus: currentOrder.paymentStatus,
          newPaymentStatus: updatedOrder.paymentStatus
        },
        request
      });
    }

    // Auto-generate profit report if order is now DELIVERED
    if (updateData.status === 'DELIVERED' && currentOrder.status !== 'DELIVERED') {
      const profitResult = await autoGenerateProfitReport(updatedOrder.id);
      if (profitResult.success) {
        if (profitResult.ledgerPosted === false) {
          logError(profitResult.message, new Error('Ledger posting failed'), 'Orders API');
        } else {
          logInfo(profitResult.message, 'Orders API');
        }
      } else {
        // Previously silently ignored — a failed profit-report generation
        // (e.g. a genuine error, not just "already exists") produced no
        // log at all, even though the order status update itself still
        // succeeded and returned 200 to the caller.
        logError(`Profit report generation did not succeed for order ${updatedOrder.id}`, new Error(profitResult.message), 'Orders API');
      }
    }

    // Best-effort shipped/delivered notification email (Amazon-style
    // gap-closure Phase 4 part 1) — same transition-detection idiom as the
    // DELIVERED -> autoGenerateProfitReport hook above.
    if (
      (updateData.status === 'SHIPPED' && currentOrder.status !== 'SHIPPED') ||
      (updateData.status === 'DELIVERED' && currentOrder.status !== 'DELIVERED')
    ) {
      const recipientEmail = updatedOrder.user?.email || updatedOrder.guestEmail;
      if (recipientEmail) {
        const emailResult = await emailService.sendOrderStatusUpdate(recipientEmail, updatedOrder.orderNumber, updateData.status);
        if (!emailResult.success) {
          console.error(`Order status email failed for order ${updatedOrder.orderNumber}: ${emailResult.error}`);
        }
      }
    }

    // Format response
    const responseOrder = {
      id: updatedOrder.id,
      orderId: updatedOrder.orderNumber,
      orderNumber: updatedOrder.orderNumber,
      userId: updatedOrder.userId,
      guestInfo: updatedOrder.guestName ? {
        name: updatedOrder.guestName,
        email: updatedOrder.guestEmail,
        mobile: updatedOrder.guestPhone
      } : null,
      items: updatedOrder.orderItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total
      })),
      shippingAddress: updatedOrder.shippingAddress,
      billingAddress: updatedOrder.billingAddress,
      paymentMethod: updatedOrder.paymentMethod,
      notes: updatedOrder.notes,
      subtotal: updatedOrder.subtotal,
      shipping: updatedOrder.shipping,
      tax: updatedOrder.tax,
      total: updatedOrder.total,
      status: updatedOrder.status.toLowerCase(),
      paymentStatus: updatedOrder.paymentStatus.toLowerCase(),
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: responseOrder,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Update Order API Error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}