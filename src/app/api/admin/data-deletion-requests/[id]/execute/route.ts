import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isSuperAdmin } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


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
    // Permanently anonymizing a user's PII is at least as destructive as
    // deleting a manual sales entry or an admin user — both of which
    // require SUPER_ADMIN in this codebase (see manual-sales/[id]/route.ts's
    // DELETE handler). A plain ADMIN being able to both approve and execute
    // this unilaterally had no real dual-control safeguard.
    const admin = await requireAuth(request);
    if (!isSuperAdmin(admin.role as UserRole)) {
      return NextResponse.json(
        { error: 'Only a super admin can execute a data deletion request' },
        { status: 403 }
      );
    }

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
      // Re-check the status transition atomically inside the transaction —
      // the pre-transaction read above is a plain, unlocked read, so two
      // concurrent executes for the same request could otherwise both pass
      // it before either commits, running the anonymization (and the audit
      // log entry) twice.
      const guarded = await tx.dataDeletionRequest.updateMany({
        where: { id, status: 'PROCESSING' },
        data: { status: 'COMPLETED', completedAt: now },
      });
      if (guarded.count === 0) {
        throw new Error('This request was already executed by another request');
      }

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

      // Unlink any Partner record from this user (ADR-008's optional
      // Partner.userId link) — the Partner business/financial record
      // itself is retained (it isn't this user's data to delete), only the
      // link to the now-anonymized login is cleared.
      await tx.partner.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Redact PII embedded in this user's historical orders. Orders
      // themselves (and their totals, line items, payments, invoices, and
      // ledger entries) are intentionally RETAINED for accounting/financial
      // audit purposes — only the free-text address fields, which
      // typically carry the customer's full name/phone/street address, are
      // scrubbed. Without this, a "completed" deletion request still left
      // full PII recoverable from every order this user ever placed.
      await tx.order.updateMany({
        where: { userId },
        data: {
          shippingAddress: '[redacted per data deletion request]',
          billingAddress: '[redacted per data deletion request]',
        },
      });

      // 3. Re-fetch the now-completed request (status already set by the
      // guarded updateMany above)
      const updated = await tx.dataDeletionRequest.findUniqueOrThrow({
        where: { id },
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

    // Handle Response throws from requireAuth
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
