import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activityLogger';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/admin/payment-config/[id]
 * Get specific payment configuration
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const config = await prisma.paymentConfig.findUnique({
      where: { id }
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/payment-config/[id]
 * Update payment configuration
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication (DB-verified role/isActive, not a raw JWT claim)
    const decoded = await requireAdmin(request);

    const { id } = await context.params;
    const body = await request.json();

    // Check if config exists
    const existingConfig = await prisma.paymentConfig.findUnique({
      where: { id }
    });

    if (!existingConfig) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration not found' },
        { status: 404 }
      );
    }

    // Update payment configuration
    const updateData: any = {
      updatedBy: decoded.id
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.accountNumber !== undefined) updateData.accountNumber = body.accountNumber || null;
    if (body.accountName !== undefined) updateData.accountName = body.accountName || null;
    if (body.accountType !== undefined) updateData.accountType = body.accountType || null;
    if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
    if (body.branchName !== undefined) updateData.branchName = body.branchName || null;
    if (body.routingNumber !== undefined) updateData.routingNumber = body.routingNumber || null;
    if (body.instructions !== undefined) updateData.instructions = body.instructions || null;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl || null;

    const config = await prisma.paymentConfig.update({
      where: { id },
      data: updateData
    });

    // Log activity
    await logActivity({
      userId: decoded.id,
      userName: 'Admin',
      action: 'UPDATE',
      entityType: 'PaymentConfig',
      entityId: config.id,
      entityName: config.name,
      description: `Updated ${config.type} payment configuration: ${config.name}`
    });

    return NextResponse.json({
      success: true,
      message: 'Payment configuration updated successfully',
      data: config
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/payment-config/[id]
 * Delete payment configuration
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication (DB-verified role/isActive, not a raw JWT claim)
    const decoded = await requireAdmin(request);

    const { id } = await context.params;

    // Check if config exists
    const config = await prisma.paymentConfig.findUnique({
      where: { id }
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration not found' },
        { status: 404 }
      );
    }

    // Delete payment configuration
    await prisma.paymentConfig.delete({
      where: { id }
    });

    // Log activity
    await logActivity({
      userId: decoded.id,
      userName: 'Admin',
      action: 'DELETE',
      entityType: 'PaymentConfig',
      entityId: config.id,
      entityName: config.name,
      description: `Deleted ${config.type} payment configuration: ${config.name}`
    });

    return NextResponse.json({
      success: true,
      message: 'Payment configuration deleted successfully'
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error deleting payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
