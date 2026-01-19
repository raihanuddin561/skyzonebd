import { NextRequest, NextResponse } from 'next/server';
import { DeletionRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * PATCH /api/admin/data-deletion-requests/[id]
 * Admin approves or rejects a deletion request
 * Enforces status transitions: PENDING -> PROCESSING/REJECTED
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const admin = await requireAdmin(request);

    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const { action, notes } = body;

    // Validate action
    if (!action || !['approve', 'reject'].includes(action.toLowerCase())) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Fetch existing request
    const existingRequest = await prisma.dataDeletionRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Enforce status transitions - can only approve/reject PENDING requests
    if (existingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot ${action.toLowerCase()} request with status ${existingRequest.status}` },
        { status: 400 }
      );
    }

    // Determine new status
    const newStatus: DeletionRequestStatus = action.toLowerCase() === 'approve' ? 'PROCESSING' : 'REJECTED';
    const now = new Date();

    // Update request in transaction
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update the request
      const updated = await tx.dataDeletionRequest.update({
        where: { id },
        data: {
          status: newStatus,
          processedBy: admin.id,
          processedAt: now,
          ...(action.toLowerCase() === 'reject' && {
            rejectedAt: now,
            rejectionReason: notes || 'No reason provided',
          }),
          notes,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              userType: true,
            },
          },
        },
      });

      // Create audit log
      await tx.dataDeletionAuditLog.create({
        data: {
          requestId: id,
          adminId: admin.id,
          action: action.toUpperCase(),
          previousStatus: existingRequest.status,
          newStatus,
          metadata: {
            notes,
            adminName: admin.name,
            adminEmail: admin.email,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `Request ${action.toLowerCase()}d successfully`,
      request: updatedRequest,
    });

  } catch (error) {
    console.error('❌ Error updating deletion request:', error);

    // Handle Response throws from requireAdmin
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: 'Failed to update deletion request' },
      { status: 500 }
    );
  }
}

// GET - Get specific deletion request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);

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
        auditLogs: {
          orderBy: {
            timestamp: 'desc',
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

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}
