import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { getActivityStats } from '@/lib/activityLogger';

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

/**
 * GET /api/admin/activity-logs/stats
 * Get activity statistics
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📥 GET /api/admin/activity-logs/stats - Request received');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;
    try {
      decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only admin can view activity stats
    if (decoded.role.toUpperCase() !== 'ADMIN') {
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
    console.error('Activity Stats API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity statistics' },
      { status: 500 }
    );
  }
}
