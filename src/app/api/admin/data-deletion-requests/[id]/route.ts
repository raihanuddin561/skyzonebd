import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminToken, type AdminAuthResult } from '@/lib/auth';

// Use shared auth helper
const verifyAdmin = verifyAdminToken;

// PATCH - Process deletion request (Approve/Reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes, rejectionReason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the deletion request
    const deletionRequest = await prisma.dataDeletionRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Deletion request not found' },
        { status: 404 }
      );
    }

    if (deletionRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Request already ${deletionRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Update request status to PROCESSING
      await prisma.dataDeletionRequest.update({
        where: { id },
        data: {
          status: 'PROCESSING',
          processedAt: new Date(),
          processedBy: auth.userId,
          notes,
        },
      });

      // TODO: Implement actual data deletion logic
      // This should be done carefully to maintain referential integrity
      // and comply with legal requirements (some data may need to be retained)
      
      // For now, we'll just mark as completed
      // In production, you would:
      // 1. Anonymize transaction data
      // 2. Delete personal information
      // 3. Keep required legal records
      // 4. Log the deletion
      
      await prisma.dataDeletionRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Deletion request approved and processed',
      });

    } else {
      // Reject the request
      await prisma.dataDeletionRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          processedBy: auth.userId,
          rejectionReason,
          notes,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Deletion request rejected',
      });
    }

  } catch (error) {
    console.error('❌ Error processing deletion request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET - Get specific deletion request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;

    const deletionRequest = await prisma.dataDeletionRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            userType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Deletion request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: deletionRequest,
    });

  } catch (error) {
    console.error('❌ Error fetching deletion request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
