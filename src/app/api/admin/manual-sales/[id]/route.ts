import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { UserRole, isSuperAdmin } from '@/types/roles';
import { logActivity } from '@/lib/activityLogger';
import { releaseStockAllocationsForOrder } from '@/services/inventoryService';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// GET /api/admin/manual-sales/[id] - Get single manual sales entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Canonical auth (ADR-009 / P2-9): requireAdmin re-fetches the user from
    // the DB on every call (fresh role, fresh isActive), so a demoted or
    // deactivated admin's still-unexpired JWT can't be used to bypass this
    // check the way a hand-rolled `jsonwebtoken.verify` + `decoded.role`
    // check could.
    await requireAdmin(request);

    const entry = await prisma.manualSalesEntry.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                sku: true,
                stockQuantity: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
      }
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Sales entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entry
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching manual sales entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales entry' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/manual-sales/[id] - Update manual sales entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Canonical auth (ADR-009 / P2-9): see GET handler above for rationale.
    const authUser = await requireAdmin(request);

    const body = await request.json();
    const {
      saleDate,
      referenceNumber,
      paymentMethod,
      paymentStatus,
      amountPaid,
      notes
    } = body;

    // Check if entry exists
    const existingEntry = await prisma.manualSalesEntry.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Sales entry not found' },
        { status: 404 }
      );
    }

    // Update only allowed fields (no item/financial changes)
    const updated = await prisma.manualSalesEntry.update({
      where: { id },
      data: {
        saleDate: saleDate ? new Date(saleDate) : undefined,
        referenceNumber: referenceNumber !== undefined ? referenceNumber : undefined,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
        paymentStatus: paymentStatus !== undefined ? paymentStatus : undefined,
        amountPaid: amountPaid !== undefined ? amountPaid : undefined,
        notes: notes !== undefined ? notes : undefined
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
            email: true,
            phone: true,
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
      }
    });

    // Log activity
    await logActivity({
      userId: authUser.id,
      userName: authUser.name || 'Admin',
      action: 'UPDATE',
      entityType: 'MANUAL_SALE',
      entityId: id,
      entityName: `Sale ${updated.referenceNumber || updated.saleDate}`,
      description: `Updated manual sale entry`,
      request
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Sales entry updated successfully'
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating manual sales entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update sales entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/manual-sales/[id] - Delete manual sales entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Canonical auth (ADR-009 / P2-9): requireAuth re-fetches the user from
    // the DB on every call (fresh role, fresh isActive) instead of trusting
    // a possibly-stale JWT payload. There's no `requireSuperAdmin` helper in
    // this codebase — every SUPER_ADMIN-tier route hand-rolls the check the
    // same way src/app/api/admin/users/route.ts's DELETE handler does, since
    // deleting a manual sale record + reversing inventory is a destructive,
    // SUPER_ADMIN-tier action here.
    const authUser = await requireAuth(request);
    if (!isSuperAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Only super admins can delete sales entries' },
        { status: 403 }
      );
    }

    // Check if entry exists
    const entry = await prisma.manualSalesEntry.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Sales entry not found' },
        { status: 404 }
      );
    }

    // Delete in transaction (restore inventory if it was adjusted)
    await prisma.$transaction(async (tx) => {
      // If inventory was adjusted, restore it
      if (entry.inventoryAdjusted) {
        for (const item of entry.items) {
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
                increment: item.quantity
              }
            }
          });

          // Create inventory log
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              action: 'ADJUSTMENT',
              quantity: item.quantity,
              previousStock: product.stockQuantity,
              newStock: product.stockQuantity + item.quantity,
              reference: id,
              notes: `Restored stock from deleted manual sale: ${entry.referenceNumber || id}`,
              performedBy: authUser.id
            }
          });
        }

        // Release any stock-lot allocations this manual sale consumed
        // (created by depleteStockLotsForSale against this entry's id as
        // the allocation's `orderId` at creation time) — keeps
        // StockLot.quantityRemaining consistent with the
        // Product.stockQuantity restoration above, rather than leaving
        // lots permanently under-reporting remaining stock after a manual
        // sale is deleted. Same reversal helper already used by
        // src/app/api/orders/cancel/route.ts for order cancellation.
        await releaseStockAllocationsForOrder(tx, id);
      }

      // Delete the entry (items will cascade delete)
      await tx.manualSalesEntry.delete({
        where: { id }
      });

      // Delete financial ledger entry
      await tx.financialLedger.deleteMany({
        where: {
          sourceType: 'MANUAL_SALE',
          sourceId: id
        }
      });
    });

    // Log activity
    await logActivity({
      userId: authUser.id,
      userName: authUser.name || 'Admin',
      action: 'DELETE',
      entityType: 'MANUAL_SALE',
      entityId: id,
      entityName: `Sale ${entry.referenceNumber || entry.saleDate}`,
      description: `Deleted manual sale entry (${entry.total.toLocaleString()} BDT)`,
      request
    });

    return NextResponse.json({
      success: true,
      message: 'Sales entry deleted successfully'
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error deleting manual sales entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales entry' },
      { status: 500 }
    );
  }
}
