// middleware/permissionMiddleware.ts - Permission Check Middleware

import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, PermissionAction } from '@/utils/permissions';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

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
    // Identity is derived from a signature-verified JWT — never trust a
    // client-supplied header for this. (This previously read the `x-user-id`
    // header directly with no verification at all, letting anyone impersonate
    // any user by guessing/knowing their id — see 08_Security_Assessment.md §1.2.)
    const userId = await getAuthenticatedUserId(request);

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
 * Get authenticated user ID from request.
 *
 * Extracts and verifies the Bearer JWT via the same token-verification path
 * used everywhere else in the app (lib/auth.ts). Returns null if there is no
 * token, or if the token fails signature/expiry verification — it never
 * falls back to a client-supplied header.
 */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  return decoded.userId;
}
