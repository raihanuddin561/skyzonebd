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
 * GET /api/admin/payment-config
 * Get all payment configurations
 */
export async function GET(request: NextRequest) {
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
        createdBy: decoded.userId,
        updatedBy: decoded.userId
      }
    });

    // Log activity
    await logActivity({
      userId: decoded.userId,
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
    console.error('Error creating payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
