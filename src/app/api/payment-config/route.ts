import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/payment-config
 * Get active payment configurations for customers
 */
export async function GET(request: NextRequest) {
  try {
    // Get only active payment configurations
    const configs = await prisma.paymentConfig.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { priority: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        type: true,
        name: true,
        accountNumber: true,
        accountName: true,
        accountType: true,
        bankName: true,
        branchName: true,
        routingNumber: true,
        instructions: true,
        logoUrl: true,
        priority: true
      }
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
