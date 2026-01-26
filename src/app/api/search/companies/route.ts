import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// GET /api/search/companies - Search companies/sellers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Build where clause for search
    const whereClause = {
      isActive: true,
      role: 'SELLER' as const,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { companyName: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } }
      ]
    };

    // Get total count
    const totalCount = await prisma.user.count({ where: whereClause });

    // Fetch companies/sellers
    const companies = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        isVerified: true,
        createdAt: true,
        businessInfo: {
          select: {
            companyType: true,
            website: true,
            verificationStatus: true
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        isVerified: 'desc'
      }
    });

    // Transform data
    const transformedCompanies = companies.map(company => ({
      id: company.id,
      name: company.companyName || company.name,
      type: company.businessInfo?.companyType || 'Business',
      verified: company.isVerified,
      website: company.businessInfo?.website,
      productCount: company._count.products,
      verificationStatus: company.businessInfo?.verificationStatus || 'PENDING'
    }));

    return NextResponse.json({
      success: true,
      data: transformedCompanies,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Search Companies Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search companies',
        data: []
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
