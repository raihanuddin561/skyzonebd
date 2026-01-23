/**
 * Admin Financial Ledger API
 * GET /api/admin/financial/ledger
 * 
 * Query financial ledger entries with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculatePeriodBalance, getUnreconciledEntries } from '@/lib/financialLedger';
import { LedgerDirection, LedgerSourceType } from '@prisma/client';

export async function GET(request: NextRequest) {
  const notices: string[] = [];

  try {
    // Authenticate admin
    await requireAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get('sourceType') as LedgerSourceType | null;
    const direction = searchParams.get('direction') as LedgerDirection | null;
    const orderId = searchParams.get('orderId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const fiscalYear = searchParams.get('fiscalYear');
    const fiscalMonth = searchParams.get('fiscalMonth');
    const reconciled = searchParams.get('reconciled');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const view = searchParams.get('view') || 'list'; // list, balance, unreconciled
    
    // Build where clause
    const where: any = {};
    
    if (sourceType) {
      where.sourceType = sourceType;
    }
    
    if (direction) {
      where.direction = direction;
    }
    
    if (orderId) {
      where.orderId = orderId;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (fiscalYear) {
      where.fiscalYear = parseInt(fiscalYear);
    }
    
    if (fiscalMonth) {
      where.fiscalMonth = parseInt(fiscalMonth);
    }
    
    if (reconciled !== null && reconciled !== undefined) {
      where.isReconciled = reconciled === 'true';
    }
    
    // Handle different views
    if (view === 'balance' && startDate && endDate) {
      // Calculate balance for period
      const balance = await calculatePeriodBalance(
        new Date(startDate),
        new Date(endDate)
      );
      
      return NextResponse.json({
        success: true,
        notices,
        data: {
          view: 'balance',
          period: {
            start: startDate,
            end: endDate,
          },
          balance,
        },
      });
    }
    
    if (view === 'unreconciled') {
      // Get unreconciled entries
      const entries = await getUnreconciledEntries(limit);
      
      if (entries.length === 0) {
        notices.push('No unreconciled ledger entries found');
      }
      
      return NextResponse.json({
        success: true,
        notices,
        data: {
          view: 'unreconciled',
          entries,
          count: entries.length,
        },
      });
    }
    
    // Default: List view with pagination
    const skip = (page - 1) * limit;
    
    const [entries, total] = await Promise.all([
      prisma.financialLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.financialLedger.count({ where }),
    ]);
    
    if (entries.length === 0) {
      notices.push('No ledger entries found for the specified criteria');
    }
    
    // Calculate totals for current page
    const pageCredits = entries
      .filter(e => e.direction === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const pageDebits = entries
      .filter(e => e.direction === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);
    
    return NextResponse.json({
      success: true,
      notices,
      data: {
        view: 'list',
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + entries.length < total,
        },
        summary: {
          pageCredits,
          pageDebits,
          pageBalance: pageCredits - pageDebits,
        },
      },
    });
    
  } catch (error) {
    console.error('Financial Ledger Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch ledger entries',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: ['Server error occurred'],
      },
      { status: 500 }
    );
  }
}
