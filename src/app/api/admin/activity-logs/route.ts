import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { getActivityLogs, getActivityStats } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

/**
 * GET /api/admin/activity-logs
 * Fetch activity logs with pagination and filters
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Canonical auth (ADR-009 / P2-9): previously hand-rolled JWT decode +
    // `role.toUpperCase() !== 'ADMIN'`, which rejected SUPER_ADMIN accounts
    // outright. requireAuth + isAdmin() correctly treats SUPER_ADMIN as
    // admin-or-higher (docs/architecture-review/14_Technical_Debt.md §22).
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') as any || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Get logs with filters
    const result = await getActivityLogs({
      page,
      limit,
      userId,
      action,
      entityType,
      startDate,
      endDate
    });

    // Format response
    const formattedLogs = result.logs.map(log => ({
      id: log.id,
      userId: log.userId,
      userName: log.userName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      description: log.description,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      user: log.user
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: result.pagination
      }
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Activity Logs API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
