import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { getActivityStats } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

/**
 * GET /api/admin/activity-logs/stats
 * Get activity statistics
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Canonical auth (ADR-009 / P2-9) — see admin/activity-logs/route.ts's
    // identical fix for why this replaced a hand-rolled, SUPER_ADMIN-excluding check.
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Get statistics
    const stats = await getActivityStats({
      userId,
      startDate,
      endDate
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Activity Stats API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity statistics' },
      { status: 500 }
    );
  }
}
