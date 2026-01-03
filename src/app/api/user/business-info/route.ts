// app/api/user/business-info/route.ts - Business Information Management

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/user/business-info
 * Get business information for current user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    const businessInfo = await prisma.businessInfo.findUnique({
      where: { userId }
    });

    return NextResponse.json({
      success: true,
      businessInfo: businessInfo || null
    });

  } catch (error) {
    console.error('Error fetching business info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch business info' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/business-info
 * Create or update business information (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    const body = await request.json();
    const {
      companyType,
      registrationNumber,
      taxId,
      tradeLicenseUrl,
      taxCertificateUrl,
      website,
      employeeCount,
      annualPurchaseVolume,
      businessAddress,
      businessCity,
      shippingPreferences,
      paymentTerms,
      creditLimit
    } = body;

    // Check if business info already exists
    const existing = await prisma.businessInfo.findUnique({
      where: { userId }
    });

    let businessInfo;

    if (existing) {
      // Update existing
      businessInfo = await prisma.businessInfo.update({
        where: { userId },
        data: {
          companyType,
          registrationNumber,
          taxId,
          tradeLicenseUrl,
          taxCertificateUrl,
          website,
          employeeCount,
          annualPurchaseVolume,
          businessAddress,
          businessCity,
          shippingPreferences,
          paymentTerms,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null
        }
      });
    } else {
      // Create new
      businessInfo = await prisma.businessInfo.create({
        data: {
          userId,
          companyType,
          registrationNumber,
          taxId,
          tradeLicenseUrl,
          taxCertificateUrl,
          website,
          employeeCount,
          annualPurchaseVolume,
          businessAddress,
          businessCity,
          shippingPreferences,
          paymentTerms,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Business information saved successfully',
      businessInfo
    });

  } catch (error) {
    console.error('Error saving business info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save business info' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/business-info
 * Delete business information
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    await prisma.businessInfo.delete({
      where: { userId }
    });

    return NextResponse.json({
      success: true,
      message: 'Business information deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting business info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete business info' },
      { status: 500 }
    );
  }
}
