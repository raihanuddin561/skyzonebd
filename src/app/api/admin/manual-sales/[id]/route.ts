import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verify, JwtPayload } from 'jsonwebtoken';
import { logActivity } from '@/lib/activityLogger';

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

// GET /api/admin/manual-sales/[id] - Get single manual sales entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Only admins can update
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
        customer: true,
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
      userId: decoded.userId,
      userName: decoded.name || 'Admin',
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

    // Only super admins can delete
    if (decoded.role !== 'SUPER_ADMIN') {
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
              performedBy: decoded.userId
            }
          });
        }
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
      userId: decoded.userId,
      userName: decoded.name || 'Admin',
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
    console.error('Error deleting manual sales entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales entry' },
      { status: 500 }
    );
  }
}
