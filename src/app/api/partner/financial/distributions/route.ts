/**
 * Partner Financial Dashboard - Distribution History
 * GET /api/partner/financial/distributions
 * 
 * Shows partner's profit distribution history with filtering and pagination
 * Includes approved, pending, and paid distributions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';

export async function GET(request: NextRequest) {
  try {
    // Authenticate partner
    const user = await requirePartner(request);
    
    // Find partner record
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { email: user.email },
          { id: user.id }
        ]
      }
    });
    
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner record not found' },
        { status: 404 }
      );
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // PENDING, APPROVED, PAID
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    // Build where clause
    const where: any = {
      partnerId: partner.id
    };
    
    if (status) {
      where.status = status;
    }
    
    // Get total count for pagination
    const total = await prisma.profitDistribution.count({ where });
    
    // Get distributions
    const distributions = await prisma.profitDistribution.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        periodType: true,
        startDate: true,
        endDate: true,
        totalRevenue: true,
        totalCosts: true,
        netProfit: true,
        partnerShare: true,
        distributionAmount: true,
        status: true,
        approvedBy: true,
        approvedAt: true,
        paidAt: true,
        paymentMethod: true,
        paymentReference: true,
        notes: true,
        createdAt: true
      }
    });
    
    // Calculate how many orders contributed to each distribution
    // (This is a simplified version - in production you'd use PartnerOrderDistribution)
    const distributionsWithMetrics = await Promise.all(
      distributions.map(async (dist) => {
        const orderCount = await prisma.order.count({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: dist.startDate,
              lte: dist.endDate
            }
          }
        });
        
        return {
          ...dist,
          orderCount,
          daysInPeriod: Math.ceil(
            (dist.endDate.getTime() - dist.startDate.getTime()) / (1000 * 60 * 60 * 24)
          ),
          averageRevenuePerDay: orderCount > 0 
            ? dist.totalRevenue / Math.ceil((dist.endDate.getTime() - dist.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0
        };
      })
    );
    
    // Calculate summary statistics
    const allDistributions = await prisma.profitDistribution.findMany({
      where: {
        partnerId: partner.id
      },
      select: {
        distributionAmount: true,
        status: true
      }
    });
    
    const totalEarned = allDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);
    const totalPaid = allDistributions
      .filter(d => d.status === 'PAID')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    const totalApproved = allDistributions
      .filter(d => d.status === 'APPROVED')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    const totalPending = allDistributions
      .filter(d => d.status === 'PENDING')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    
    const outstanding = totalApproved; // Approved but not yet paid
    
    // Create pagination metadata
    const pagination = createPaginationResponse(total, page, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        distributions: distributionsWithMetrics,
        summary: {
          totalEarned,
          totalPaid,
          totalApproved,
          totalPending,
          outstanding,
          lifetimeCount: allDistributions.length
        }
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Partner Distributions Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch distributions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
