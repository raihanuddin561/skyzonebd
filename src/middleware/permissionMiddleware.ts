// middleware/permissionMiddleware.ts - Permission Check Middleware

import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, PermissionAction } from '@/utils/permissions';

/**
 * Check if request has valid permission
 * Usage in API routes:
 * 
 * const permissionCheck = await checkPermission(request, 'INVENTORY_MANAGE', 'edit');
 * if (!permissionCheck.authorized) {
 *   return permissionCheck.response;
 * }
 * const userId = permissionCheck.userId;
 */
export async function checkPermission(
  request: NextRequest,
  module: string,
  action: PermissionAction
): Promise<{
  authorized: boolean;
  userId?: string;
  response?: NextResponse;
}> {
  try {
    // Get user ID from header or JWT token
    // TODO: Replace with your actual authentication method
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return {
        authorized: false,
        response: NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          },
          { status: 401 }
        )
      };
    }
    
    // Check permission
    const hasAccess = await hasPermission(userId, module, action);
    
    if (!hasAccess) {
      return {
        authorized: false,
        userId,
        response: NextResponse.json(
          { 
            success: false, 
            error: 'Permission denied',
            code: 'PERMISSION_DENIED',
            details: `You don't have ${action} permission for ${module}`
          },
          { status: 403 }
        )
      };
    }
    
    return {
      authorized: true,
      userId
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { 
          success: false, 
          error: 'Permission check failed',
          code: 'PERMISSION_CHECK_ERROR'
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Require specific permission (throws if not authorized)
 */
export async function requirePermission(
  request: NextRequest,
  module: string,
  action: PermissionAction
): Promise<string> {
  const check = await checkPermission(request, module, action);
  
  if (!check.authorized) {
    throw new PermissionError(
      `Permission denied: ${action} on ${module}`,
      check.response!
    );
  }
  
  return check.userId!;
}

/**
 * Permission error class
 */
export class PermissionError extends Error {
  response: NextResponse;
  
  constructor(message: string, response: NextResponse) {
    super(message);
    this.name = 'PermissionError';
    this.response = response;
  }
}

/**
 * Get authenticated user ID from request
 */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  // TODO: Replace with your actual authentication method
  // This could parse JWT token, validate session, etc.
  return request.headers.get('x-user-id');
}
