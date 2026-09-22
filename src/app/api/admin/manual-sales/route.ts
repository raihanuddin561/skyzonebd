import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';
import { alertIfCrossedReorderLevel } from '@/utils/lowStockAlerts';
import { depleteStockLotsForSale } from '@/services/inventoryService';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// GET /api/admin/manual-sales - List all manual sales entries
export async function GET(request: NextRequest) {
  try {
    // Canonical auth (ADR-009 / P2-9): requireAdmin re-fetches the user from
    // the DB on every call (fresh role, fresh isActive), so a demoted or
    // deactivated admin's still-unexpired JWT can't be used to bypass this
    // check the way a hand-rolled `jsonwebtoken.verify` + `decoded.role`
    // check could.
    await requireAdmin(request);

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
    if (error instanceof Response) {
      return error;
    }
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
    // Canonical auth (ADR-009 / P2-9): see GET handler above for rationale.
    const authUser = await requireAdmin(request);

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
          reorderLevel: true,
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
    // let (not const): depleteStockLotsForSale below may correct totalCost
    // (and therefore these derived figures) from the flat fallback estimate
    // to the real weighted-average lot cost once stock lots are depleted.
    let totalProfit = total - totalCost;
    let profitMargin = total > 0 ? (totalProfit / total) * 100 : 0;

    // Collects stock-crossing candidates during the transaction below, for
    // a best-effort, non-blocking low-stock alert fired after it commits
    // (Amazon-style gap-closure Phase 1).
    const stockAlertCandidates: Array<{ product: { id: string; name: string; sku: string | null; reorderLevel: number | null }; previousStock: number; newStock: number }> = [];

    // Create manual sales entry in transaction
    const entry = await prisma.$transaction(async (tx) => {
      // Create the sales entry
      let newEntry = await tx.manualSalesEntry.create({
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
          enteredBy: authUser.id,
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
        // Group the just-created line items by product so each request line
        // below can be paired with its corresponding ManualSalesItem record
        // (needed to snapshot the real, lot-based cost onto it) even when
        // the same product appears on more than one line.
        const itemsByProduct = new Map<string, typeof newEntry.items>();
        for (const saleItem of newEntry.items) {
          const bucket = itemsByProduct.get(saleItem.productId) ?? [];
          bucket.push(saleItem);
          itemsByProduct.set(saleItem.productId, bucket);
        }

        let costsCorrected = false;

        for (const item of items) {
          // Fetch product for previous stock value (and for the low-stock
          // alert check below — Amazon-style gap-closure Phase 1)
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stockQuantity: true, name: true, sku: true, reorderLevel: true }
          });

          if (!product) continue;

          // Guard the decrement against a concurrent sale/order consuming
          // the same stock between this pre-fetch and this write (this read
          // and the write below are both inside the transaction, but
          // Postgres's default READ COMMITTED isolation does not by itself
          // prevent that race). If a concurrent transaction already took
          // the remaining units, `count` is 0 and the whole manual-sale
          // transaction rolls back rather than committing negative stock
          // (Production Readiness Audit, 2026-07-18).
          const stockUpdate = await tx.product.updateMany({
            where: { id: item.productId, stockQuantity: { gte: item.quantity } },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          });
          if (stockUpdate.count === 0) {
            throw new Error(`Insufficient stock for product ${item.productId} (concurrent sale consumed the remaining units)`);
          }

          stockAlertCandidates.push({
            product: { id: item.productId, name: product.name, sku: product.sku, reorderLevel: product.reorderLevel },
            previousStock: product.stockQuantity,
            newStock: product.stockQuantity - item.quantity,
          });

          // Deplete real stock lots for accurate Weighted-Average-Cost COGS
          // (same two-step pattern already used for online orders in
          // src/app/api/orders/route.ts: the guarded Product.stockQuantity
          // decrement above remains the authoritative oversell guard — this
          // call is purely for cost-basis accuracy on top of it, keeping
          // StockLot.quantityRemaining in sync instead of drifting away from
          // Product.stockQuantity the way manual sales previously did).
          // Falls back to the flat cost already snapshotted in itemsData
          // (costPerUnit: null) if this product has no stock-lot history
          // yet, so products never restocked through the lot-tracked
          // restock endpoint behave exactly as before.
          const saleItem = itemsByProduct.get(item.productId)?.shift();
          if (saleItem) {
            const { costPerUnit: wacCostPerUnit } = await depleteStockLotsForSale(tx, {
              productId: item.productId,
              quantity: item.quantity,
              orderId: newEntry.id,
              orderItemId: saleItem.id,
            });

            if (wacCostPerUnit !== null && wacCostPerUnit !== saleItem.costPerUnit) {
              const itemTotalCost = saleItem.quantity * wacCostPerUnit;
              const itemProfit = saleItem.total - itemTotalCost;
              const itemProfitMargin = saleItem.total > 0 ? (itemProfit / saleItem.total) * 100 : 0;

              await tx.manualSalesItem.update({
                where: { id: saleItem.id },
                data: {
                  costPerUnit: wacCostPerUnit,
                  totalCost: itemTotalCost,
                  profit: itemProfit,
                  profitMargin: itemProfitMargin,
                }
              });

              // Roll the corrected line cost into the sale-level aggregates
              // so the entry's totalCost/totalProfit/profitMargin (and the
              // COGS ledger debit below) reflect the real lot cost instead
              // of the flat fallback estimate.
              totalCost = totalCost - saleItem.totalCost + itemTotalCost;
              costsCorrected = true;
            }
          }

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
              performedBy: authUser.id
            }
          });
        }

        if (costsCorrected) {
          totalProfit = total - totalCost;
          profitMargin = total > 0 ? (totalProfit / total) * 100 : 0;
        }

        // Mark inventory as adjusted, and persist any lot-based cost
        // corrections made above to the sale-level aggregates.
        newEntry = await tx.manualSalesEntry.update({
          where: { id: newEntry.id },
          data: {
            inventoryAdjusted: true,
            ...(costsCorrected ? { totalCost, totalProfit, profitMargin } : {})
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
          createdBy: authUser.id
        }
      });

      // Matching COGS debit — previously this entry's only ledger posting
      // was the revenue CREDIT above, leaving every manual/offline sale's
      // cost of goods invisible to financial reporting and the ledger
      // unbalanced for this entire sales channel (Amazon-style gap-closure
      // Phase 0; same double-entry pattern already used for online orders
      // in lib/financialLedger.ts's createOrderLedgerEntries). Uses the
      // (possibly lot-corrected) totalCost computed above.
      if (totalCost > 0) {
        await tx.financialLedger.create({
          data: {
            sourceType: 'MANUAL_SALE',
            sourceId: newEntry.id,
            sourceName: `Manual Sale: ${referenceNumber || newEntry.id}`,
            amount: totalCost,
            direction: 'DEBIT',
            category: 'COGS',
            subcategory: saleType || 'OFFLINE',
            description: `Cost of goods for manual sale - ${itemsData.length} items`,
            notes: notes || null,
          }
        });
      }

      return newEntry;
    });

    // Best-effort, non-blocking low-stock alerts, fired after the
    // transaction has committed (Amazon-style gap-closure Phase 1).
    for (const candidate of stockAlertCandidates) {
      await alertIfCrossedReorderLevel(candidate.product, candidate.previousStock, candidate.newStock);
    }

    // Log activity
    await logActivity({
      userId: authUser.id,
      userName: authUser.name || 'Admin',
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
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating manual sales entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create manual sales entry' },
      { status: 500 }
    );
  }
}
