import { NextRequest, NextResponse } from 'next/server';
import { DeletionRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyAdminToken, type AdminAuthResult } from '@/lib/auth';

// Use shared auth helper
const verifyAdmin = verifyAdminToken;

// GET - List all deletion requests (Admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

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
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
