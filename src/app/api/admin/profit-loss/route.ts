// app/api/admin/profit-loss/route.ts - Comprehensive Profit & Loss Report API

import { NextRequest, NextResponse } from 'next/server';
import { 
  calculateComprehensiveProfit, 
  saveProfitLossReport,
  getProfitTrend,
  calculateYTDProfit 
} from '@/utils/comprehensiveProfitCalculation';
import { checkPermission } from '@/middleware/permissionMiddleware';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/profit-loss
 * Get profit & loss report for a period
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'PROFIT_LOSS_VIEW', 'view');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type'); // 'monthly', 'trend', 'ytd'
    
    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }
    
    const yearNum = parseInt(year);
    
    // Year-to-Date Report
    if (type === 'ytd') {
      const ytdReport = await calculateYTDProfit(yearNum);
      return NextResponse.json({
        success: true,
        data: ytdReport,
        type: 'ytd'
      });
    }
    
    // Trend Report (multiple months)
    if (type === 'trend') {
      const startMonth = parseInt(searchParams.get('startMonth') || '1');
      const endMonth = parseInt(searchParams.get('endMonth') || '12');
      
      const trendData = await getProfitTrend(
        startMonth,
        yearNum,
        endMonth,
        yearNum
      );
      
      return NextResponse.json({
        success: true,
        data: trendData,
        type: 'trend'
      });
    }
    
    // Monthly Report
    if (!month) {
      return NextResponse.json(
        { success: false, error: 'Month parameter is required for monthly report' },
        { status: 400 }
      );
    }
    
    const monthNum = parseInt(month);
    const report = await calculateComprehensiveProfit({
      month: monthNum,
      year: yearNum
    });
    
    // Save report to database
    await saveProfitLossReport(report);
    
    return NextResponse.json({
      success: true,
      data: report,
      type: 'monthly'
    });
  } catch (error: any) {
    console.error('Error generating profit & loss report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/profit-loss/saved
 * Get saved profit & loss reports from database
 */
export async function getSavedReports(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    
    const where: any = {};
    if (year) where.year = parseInt(year);
    
    const reports = await prisma.profitLossReport.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });
    
    return NextResponse.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching saved reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved reports' },
      { status: 500 }
    );
  }
}
