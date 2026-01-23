/**
 * Admin Financial Reports - Outstanding Payouts
 * GET /api/admin/financial/outstanding-payouts
 * 
 * Track all approved but unpaid partner distributions
 * Includes overdue alerts and payment scheduling
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/financialCalculator';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';
import { differenceInDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await requireAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // APPROVED, PENDING (for filtering)
    const partnerId = searchParams.get('partnerId');
    const overdue = searchParams.get('overdue') === 'true'; // Show only overdue
    const sortBy = searchParams.get('sortBy') || 'approvedAt'; // approvedAt, amount, daysOutstanding
    
    // Get pagination params
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    // Build where clause for outstanding distributions
    const where: any = {
      status: status || { in: ['APPROVED', 'PENDING'] }
    };
    
    if (partnerId) {
      where.partnerId = partnerId;
    }
    
    // Get total count
    const total = await prisma.profitDistribution.count({ where });
    
    // Get distributions
    const distributions = await prisma.profitDistribution.findMany({
      where,
      skip,
      take,
      orderBy: sortBy === 'approvedAt' 
        ? { approvedAt: 'asc' }
        : sortBy === 'amount'
        ? { distributionAmount: 'desc' }
        : { createdAt: 'asc' },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profitSharePercentage: true
          }
        }
      }
    });
    
    // Enrich distributions with calculated fields
    const enrichedDistributions = distributions.map(dist => {
      const daysOutstanding = dist.approvedAt 
        ? differenceInDays(new Date(), dist.approvedAt)
        : dist.createdAt 
        ? differenceInDays(new Date(), dist.createdAt)
        : 0;
      
      const isOverdue = daysOutstanding > 30; // Consider overdue after 30 days
      const urgency = daysOutstanding > 60 ? 'high' : daysOutstanding > 30 ? 'medium' : 'low';
      
      return {
        id: dist.id,
        partnerId: dist.partnerId,
        partnerName: dist.partner.name,
        partnerEmail: dist.partner.email,
        partnerPhone: dist.partner.phone,
        periodType: dist.periodType,
        startDate: dist.startDate,
        endDate: dist.endDate,
        totalRevenue: dist.totalRevenue,
        totalCosts: dist.totalCosts,
        netProfit: dist.netProfit,
        partnerShare: dist.partnerShare,
        distributionAmount: dist.distributionAmount,
        status: dist.status,
        approvedBy: dist.approvedBy,
        approvedAt: dist.approvedAt,
        createdAt: dist.createdAt,
        paymentMethod: dist.paymentMethod,
        notes: dist.notes,
        // Calculated fields
        daysOutstanding,
        isOverdue,
        urgency,
        // Formatted values
        distributionAmountFormatted: formatCurrency(dist.distributionAmount),
        totalRevenueFormatted: formatCurrency(dist.totalRevenue)
      };
    });
    
    // Filter by overdue if requested
    let filteredDistributions = enrichedDistributions;
    if (overdue) {
      filteredDistributions = enrichedDistributions.filter(d => d.isOverdue);
    }
    
    // Calculate summary statistics
    const totalOutstanding = filteredDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);
    const approvedCount = filteredDistributions.filter(d => d.status === 'APPROVED').length;
    const pendingCount = filteredDistributions.filter(d => d.status === 'PENDING').length;
    const overdueCount = filteredDistributions.filter(d => d.isOverdue).length;
    const highUrgencyCount = filteredDistributions.filter(d => d.urgency === 'high').length;
    
    // Group by partner
    const byPartner = filteredDistributions.reduce((acc, dist) => {
      const key = dist.partnerId;
      if (!acc[key]) {
        acc[key] = {
          partnerId: dist.partnerId,
          partnerName: dist.partnerName,
          totalOutstanding: 0,
          count: 0,
          oldestDate: dist.approvedAt || dist.createdAt,
          items: []
        };
      }
      acc[key].totalOutstanding += dist.distributionAmount;
      acc[key].count += 1;
      acc[key].items.push(dist);
      
      // Track oldest outstanding
      const distDate = dist.approvedAt || dist.createdAt;
      if (distDate < acc[key].oldestDate) {
        acc[key].oldestDate = distDate;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    const partnerSummaries = Object.values(byPartner).map((p: any) => ({
      partnerId: p.partnerId,
      partnerName: p.partnerName,
      totalOutstanding: p.totalOutstanding,
      count: p.count,
      oldestOutstanding: differenceInDays(new Date(), p.oldestDate),
      totalOutstandingFormatted: formatCurrency(p.totalOutstanding)
    }));
    
    // Sort partner summaries by total outstanding
    partnerSummaries.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    // Create pagination metadata
    const pagination = createPaginationResponse(total, page, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        distributions: filteredDistributions,
        summary: {
          totalOutstanding,
          approvedCount,
          pendingCount,
          overdueCount,
          highUrgencyCount,
          averageOutstanding: filteredDistributions.length > 0 
            ? totalOutstanding / filteredDistributions.length 
            : 0,
          // Formatted
          totalOutstandingFormatted: formatCurrency(totalOutstanding)
        },
        byPartner: partnerSummaries
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString(),
        filters: {
          status,
          partnerId,
          overdue,
          sortBy
        }
      }
    });
    
  } catch (error) {
    console.error('Outstanding Payouts Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch outstanding payouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
