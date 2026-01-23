import { NextRequest, NextResponse } from 'next/server';
import { DeletionRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// GET - List all deletion requests (Admin only)
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'ALL' ? { status: status as DeletionRequestStatus } : {};

    const requests = await prisma.dataDeletionRequest.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            userType: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      requests,
      total: requests.length,
    });

  } catch (error) {
    console.error('❌ Error fetching deletion requests:', error);

    // Handle Response throws from requireAdmin
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
