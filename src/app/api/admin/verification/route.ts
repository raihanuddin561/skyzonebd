import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { emailService } from '@/lib/email';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause for BusinessInfo
    const where: any = {};

    if (status && status !== 'all') {
      where.verificationStatus = status.toUpperCase();
    }

    if (search) {
      where.OR = [
        { 
          user: { 
            name: { contains: search, mode: 'insensitive' } 
          } 
        },
        { 
          user: { 
            email: { contains: search, mode: 'insensitive' } 
          } 
        },
        { 
          user: { 
            companyName: { contains: search, mode: 'insensitive' } 
          } 
        },
      ];
    }

    // Get business verification applications with pagination, plus a
    // status breakdown across ALL applications (unfiltered by the current
    // `status` param) so the stats cards reflect real counts instead of
    // hardcoded placeholder numbers.
    const [applications, totalCount, statusCounts] = await Promise.all([
      prisma.businessInfo.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              companyName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.businessInfo.count({ where }),
      prisma.businessInfo.groupBy({
        by: ['verificationStatus'],
        _count: true,
      }),
    ]);

    // Note: VerificationStatus has no UNDER_REVIEW value (PENDING, APPROVED,
    // REJECTED, RESUBMIT only) — the frontend's "Under Review" filter option
    // is a pre-existing dead filter that can never match anything real.
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const group of statusCounts) {
      const key = group.verificationStatus.toLowerCase() as keyof typeof stats;
      if (key in stats) {
        stats[key] = group._count;
      }
    }

    // Format applications data
    const formattedApplications = applications.map(app => ({
      id: app.id,
      user: {
        id: app.user.id,
        name: app.user.name,
        email: app.user.email,
        phone: app.user.phone || 'N/A',
      },
      businessInfo: {
        businessName: app.user.companyName || 'N/A',
        businessType: app.companyType || 'N/A',
        registrationNumber: app.registrationNumber || 'N/A',
        taxNumber: app.taxId || 'N/A',
        address: app.businessAddress || 'N/A',
        city: app.businessCity || 'N/A',
        country: app.businessCountry,
        website: app.website || undefined,
        employeeCount: app.employeeCount || 'N/A',
        annualPurchaseVolume: app.annualPurchaseVolume || 'N/A',
      },
      documents: [
        ...(app.tradeLicenseUrl ? [{
          type: 'Trade License',
          name: 'trade_license.pdf',
          url: app.tradeLicenseUrl,
          uploadedAt: app.createdAt.toISOString(),
        }] : []),
        ...(app.taxCertificateUrl ? [{
          type: 'Tax Certificate',
          name: 'tax_certificate.pdf',
          url: app.taxCertificateUrl,
          uploadedAt: app.createdAt.toISOString(),
        }] : []),
      ],
      status: app.verificationStatus.toLowerCase(),
      submittedAt: app.createdAt.toISOString(),
      reviewedAt: app.verifiedAt?.toISOString(),
      reviewedBy: undefined, // Not tracked in schema
      rejectionReason: undefined, // Not in schema
    }));

    return NextResponse.json({
      success: true,
      data: {
        applications: formattedApplications,
        stats,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching verification applications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch verification applications' },
      { status: 500 }
    );
  }
}

// Update verification status
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId, action, reason } = body;

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Get the business info to find user
    const businessInfo = await prisma.businessInfo.findUnique({
      where: { id: applicationId },
      include: { user: { select: { id: true, name: true, email: true, phone: true, companyName: true } } },
    });

    if (!businessInfo) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};
    let userUpdate: any = {};

    switch (action) {
      case 'approve':
        updateData = {
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
        };
        userUpdate = { isVerified: true };
        break;
      case 'reject':
        updateData = {
          verificationStatus: 'REJECTED',
        };
        userUpdate = { isVerified: false };
        // Note: rejectionReason would need to be added to schema
        break;
      case 'review':
        updateData = {
          verificationStatus: 'UNDER_REVIEW',
        };
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update business info
    await prisma.businessInfo.update({
      where: { id: applicationId },
      data: updateData,
    });

    // Update user if needed
    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({
        where: { id: businessInfo.userId },
        data: userUpdate,
      });
    }

    // Best-effort status-change email (Amazon-style gap-closure Phase 4
    // part 1) — only for approve/reject, not the intermediate "review" action.
    if (action === 'approve' || action === 'reject') {
      const emailResult = await emailService.sendBusinessVerificationStatus(
        businessInfo.user.email,
        businessInfo.user.name,
        action === 'approve' ? 'APPROVED' : 'REJECTED',
        action === 'reject' ? reason : undefined
      );
      if (!emailResult.success) {
        console.error(`Business verification status email failed for ${businessInfo.user.email}: ${emailResult.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application ${action}d successfully`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating verification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update verification' },
      { status: 500 }
    );
  }
}

// Delete verification applications
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationIds } = body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Application IDs array is required' },
        { status: 400 }
      );
    }

    await prisma.businessInfo.deleteMany({
      where: {
        id: { in: applicationIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${applicationIds.length} application(s) deleted successfully`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error deleting applications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete applications' },
      { status: 500 }
    );
  }
}
