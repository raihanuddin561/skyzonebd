import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

/**
 * POST /api/admin/data-deletion-requests/[id]/execute
 * Admin executes an approved deletion request
 * Enforces status transition: PROCESSING -> COMPLETED
 * Safely deletes or anonymizes user data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const admin = await requireAdmin(request);

    const { id } = await params;

    // Fetch existing request
    const existingRequest = await prisma.dataDeletionRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            orders: { select: { id: true } },
            products: { select: { id: true } },
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Enforce status transition - can only execute PROCESSING requests
    if (existingRequest.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: `Cannot execute request with status ${existingRequest.status}. Must be PROCESSING.` },
        { status: 400 }
      );
    }

    const userId = existingRequest.userId;
    const now = new Date();

    // Execute deletion in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Anonymize user data (preserve referential integrity)
      const anonymizedEmail = `deleted_${userId}@anonymous.local`;
      const anonymizedName = `Deleted User ${userId.substring(0, 8)}`;

      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: anonymizedName,
          phone: null,
          password: 'DELETED',
          isActive: false,
          // Clear optional fields
          companyName: null,
          discountPercent: 0,
          discountReason: null,
          discountValidUntil: null,
          profitSharePercentage: null,
          isProfitPartner: false,
        },
      });

      // 2. Delete or anonymize related data
      // BusinessInfo
      await tx.businessInfo.deleteMany({ where: { userId } });

      // Addresses
      await tx.address.deleteMany({ where: { userId } });

      // RFQs (keep for audit, but anonymize user reference)
      await tx.rFQ.updateMany({
        where: { userId },
        data: {
          subject: 'Anonymized Request',
          message: 'User data removed',
        },
      });

      // Activity logs (keep for audit trail)
      // These are admin actions, should be retained

      // Permissions
      await tx.userPermission.deleteMany({ where: { userId } });

      // Products created by user
      // Decision: Keep products but transfer ownership or mark as deleted
      // Products created by user (disassociate seller)
      await tx.product.updateMany({
        where: { sellerId: userId },
        data: {
          sellerId: null, // Remove seller association
        },
      });

      // 3. Update deletion request status
      const updated = await tx.dataDeletionRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // 4. Create audit log
      await tx.dataDeletionAuditLog.create({
        data: {
          requestId: id,
          adminId: admin.id,
          action: 'EXECUTED',
          previousStatus: existingRequest.status,
          newStatus: 'COMPLETED',
          metadata: {
            adminName: admin.name,
            adminEmail: admin.email,
            deletedUserId: userId,
            executionTimestamp: now.toISOString(),
            dataDeleted: {
              businessInfo: true,
              addresses: true,
              permissions: true,
              userAnonymized: true,
            },
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: 'Data deletion executed successfully',
      request: result,
    });

  } catch (error) {
    console.error('❌ Error executing deletion:', error);

    // Handle Response throws from requireAdmin
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { 
        error: 'Failed to execute deletion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
