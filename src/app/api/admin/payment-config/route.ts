import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/admin/payment-config
 * Get all payment configurations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication (DB-verified role/isActive, not a raw JWT claim)
    await requireAdmin(request);

    // Get all payment configurations
    const configs = await prisma.paymentConfig.findMany({
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: configs
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching payment configs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payment-config
 * Create new payment configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication (DB-verified role/isActive, not a raw JWT claim)
    const decoded = await requireAdmin(request);

    const body = await request.json();
    const {
      type,
      name,
      isActive,
      priority,
      accountNumber,
      accountName,
      accountType,
      bankName,
      branchName,
      routingNumber,
      instructions,
      logoUrl
    } = body;

    // Validate required fields
    if (!type || !name) {
      return NextResponse.json(
        { success: false, error: 'Type and name are required' },
        { status: 400 }
      );
    }

    // Create payment configuration
    const config = await prisma.paymentConfig.create({
      data: {
        type: type.toUpperCase(),
        name,
        isActive: isActive ?? true,
        priority: priority ?? 0,
        accountNumber: accountNumber || null,
        accountName: accountName || null,
        accountType: accountType || null,
        bankName: bankName || null,
        branchName: branchName || null,
        routingNumber: routingNumber || null,
        instructions: instructions || null,
        logoUrl: logoUrl || null,
        createdBy: decoded.id,
        updatedBy: decoded.id
      }
    });

    // Log activity
    await logActivity({
      userId: decoded.id,
      userName: 'Admin',
      action: 'CREATE',
      entityType: 'PaymentConfig',
      entityId: config.id,
      entityName: config.name,
      description: `Created ${config.type} payment configuration: ${config.name}`
    });

    return NextResponse.json({
      success: true,
      message: 'Payment configuration created successfully',
      data: config
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
