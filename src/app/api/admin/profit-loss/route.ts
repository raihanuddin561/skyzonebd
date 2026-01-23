// app/api/admin/profit-loss/route.ts - Comprehensive Profit & Loss Report API

import { NextRequest, NextResponse } from 'next/server';
import { 
  calculateComprehensiveProfit, 
  saveProfitLossReport,
  getProfitTrend,
  calculateYTDProfit 
} from '@/utils/comprehensiveProfitCalculation';
import { checkPermission } from '@/middleware/permissionMiddleware';

/**
 * GET /api/admin/profit-loss
 * Get profit & loss report for a period
 * Requires PROFIT_LOSS_VIEW permission
 */
export async function GET(request: NextRequest) {
  const notices: string[] = [];

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
        { success: false, error: 'Year parameter is required', notices: ['Missing year parameter'] },
        { status: 400 }
      );
    }
    
    const yearNum = parseInt(year);
    
    if (isNaN(yearNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid year parameter', notices: ['Year must be a valid number'] },
        { status: 400 }
      );
    }
    
    // Year-to-Date Report
    if (type === 'ytd') {
      const ytdReport = await calculateYTDProfit(yearNum);
      return NextResponse.json({
        success: true,
        notices,
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
        notices,
        data: trendData,
        type: 'trend'
      });
    }
    
    // Monthly Report
    if (!month) {
      return NextResponse.json(
        { success: false, error: 'Month parameter is required for monthly report', notices: ['Missing month parameter'] },
        { status: 400 }
      );
    }
    
    const monthNum = parseInt(month);
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid month parameter', notices: ['Month must be between 1 and 12'] },
        { status: 400 }
      );
    }
    
    const report = await calculateComprehensiveProfit({
      month: monthNum,
      year: yearNum
    });
    
    // Save report to database
    await saveProfitLossReport(report);
    
    return NextResponse.json({
      success: true,
      notices,
      data: report,
      type: 'monthly'
    });
  } catch (error: any) {
    console.error('Error generating profit & loss report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report',
        details: error?.message || 'Unknown error',
        notices: notices.length > 0 ? notices : ['Server error occurred']
      },
      { status: 500 }
    );
  }
}
