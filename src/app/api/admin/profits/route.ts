import { NextRequest, NextResponse } from 'next/server';
import {
  calculateProfitForPeriod,
  distributeProfitToPartners,
  getProfitSummary,
  getProfitTrends,
} from '@/utils/partnerProfitDistribution';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') as 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' || 'THIS_MONTH';

    // Get profit summary for dashboard
    if (action === 'summary') {
      const summary = await getProfitSummary(period);
      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    // Get profit trends for charts
    if (action === 'trends') {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Start date and end date required' },
          { status: 400 }
        );
      }

      const groupBy = searchParams.get('groupBy') as 'DAY' | 'WEEK' | 'MONTH' || 'DAY';
      const trends = await getProfitTrends(
        new Date(startDate),
        new Date(endDate),
        groupBy
      );

      return NextResponse.json({
        success: true,
        data: { trends },
      });
    }

    // Calculate profit for specific period
    if (startDate && endDate) {
      const profitData = await calculateProfitForPeriod(
        new Date(startDate),
        new Date(endDate)
      );

      return NextResponse.json({
        success: true,
        data: profitData,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error calculating profit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate profit' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, periodType, startDate, endDate } = body;

    if (action === 'distribute') {
      if (!periodType || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Period type, start date, and end date are required' },
          { status: 400 }
        );
      }

      const result = await distributeProfitToPartners(
        periodType,
        new Date(startDate),
        new Date(endDate)
      );

      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: {
          profitData: result.profitData,
          distributions: result.distributions,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing profit request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
