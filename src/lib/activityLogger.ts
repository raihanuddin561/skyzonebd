import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

export type ActivityAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'STATUS_CHANGE' 
  | 'CANCEL' 
  | 'RESTORE' 
  | 'EXPORT' 
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT';

export interface LogActivityParams {
  userId: string;
  userName: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
  request?: NextRequest;
}

interface ActivityLogFilter {
  userId?: string;
  action?: ActivityAction;
  entityType?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

/**
 * Log admin activity to database
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const {
      userId,
      userName,
      action,
      entityType,
      entityId,
      entityName,
      description,
      metadata,
      request
    } = params;

    // Extract IP and user agent from request if provided
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      // Get IP from various headers (supports proxies)
      ipAddress = 
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') || // Cloudflare
        'unknown';
      
      userAgent = request.headers.get('user-agent') || undefined;
    }

    await prisma.activityLog.create({
      data: {
        userId,
        userName,
        action,
        entityType,
        entityId,
        entityName,
        description,
        metadata: metadata || {},
        ipAddress,
        userAgent,
      }
    });

    console.log(`📝 Activity logged: ${action} ${entityType} by ${userName}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break the main flow
  }
}

/**
 * Get activity logs with pagination and filters
 */
export async function getActivityLogs(params: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: ActivityAction;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    limit = 50,
    userId,
    action,
    entityType,
    startDate,
    endDate
  } = params;

  const where: ActivityLogFilter = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.activityLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}

/**
 * Get activity summary/statistics
 */
export async function getActivityStats(params: {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { userId, startDate, endDate } = params;
  
  const where: ActivityLogFilter = {};
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  // Get counts by action type
  const actionCounts = await prisma.activityLog.groupBy({
    by: ['action'],
    where,
    _count: {
      action: true
    }
  });

  // Get counts by entity type
  const entityCounts = await prisma.activityLog.groupBy({
    by: ['entityType'],
    where,
    _count: {
      entityType: true
    }
  });

  // Get most active admins
  const adminActivity = await prisma.activityLog.groupBy({
    by: ['userId', 'userName'],
    where,
    _count: {
      userId: true
    },
    orderBy: {
      _count: {
        userId: 'desc'
      }
    },
    take: 10
  });

  return {
    actionCounts: actionCounts.map(item => ({
      action: item.action,
      count: item._count.action
    })),
    entityCounts: entityCounts.map(item => ({
      entityType: item.entityType,
      count: item._count.entityType
    })),
    topAdmins: adminActivity.map(item => ({
      userId: item.userId,
      userName: item.userName,
      activityCount: item._count.userId
    }))
  };
}

export default {
  logActivity,
  getActivityLogs,
  getActivityStats
};
