import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
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

    // Get business verification applications with pagination
    const [applications, totalCount] = await Promise.all([
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
    ]);

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
        address: 'N/A', // Not in schema
        city: 'N/A', // Not in schema
        country: 'Bangladesh',
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
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
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
      include: { user: true },
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

    return NextResponse.json({
      success: true,
      message: `Application ${action}d successfully`,
    });
  } catch (error) {
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
    console.error('Error deleting applications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete applications' },
      { status: 500 }
    );
  }
}
