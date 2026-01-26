import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

/**
 * GET /api/admin/payment-config/[id]
 * Get specific payment configuration
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
    // Verify admin authentication
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
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

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
      updatedBy: decoded.userId
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
      userId: decoded.userId,
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
    // Verify admin authentication
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
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

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
      userId: decoded.userId,
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
    console.error('Error deleting payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
