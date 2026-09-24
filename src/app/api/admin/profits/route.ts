import { NextRequest, NextResponse } from 'next/server';
import {
  calculateProfitForPeriod,
  distributeProfitToPartners,
  getProfitSummary,
  getProfitTrends,
} from '@/utils/partnerProfitDistribution';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { prisma } from '@/lib/prisma';

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
    if (error instanceof Response) {
      return error;
    }
    console.error('Error calculating profit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate profit' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, periodType, startDate, endDate } = body;

    if (action === 'distribute') {
      if (!periodType || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Period type, start date, and end date are required' },
          { status: 400 }
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Unguarded double-submit race: distributeProfitToPartners() creates
      // one ProfitDistribution per active partner for this period with no
      // existence check of its own (there's no requireAdmin-adjacent lock
      // inside the canonical util). Two concurrent/double-click "Distribute"
      // requests for the same period would both pass straight through and
      // each create a full set of distributions, double-paying every
      // partner for the period. This mirrors the exact race already closed
      // in admin/payouts/generate/route.ts (single-partner distributions):
      // a Postgres transaction-scoped advisory lock keyed on the period
      // serializes concurrent requests, and the loser's existence check
      // (re-run after acquiring the lock) sees the winner's now-committed
      // rows and safely rejects instead of creating duplicates.
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${periodType} || ':' || ${start.toISOString()} || ':' || ${end.toISOString()}))`;

        const existing = await tx.profitDistribution.findFirst({
          where: { periodType, startDate: start, endDate: end },
        });

        if (existing) {
          throw new Response(
            JSON.stringify({
              success: false,
              error: 'Distributions for this period have already been generated',
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return distributeProfitToPartners(periodType, start, end);
      });

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
    if (error instanceof Response) {
      return error;
    }
    console.error('Error processing profit request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
