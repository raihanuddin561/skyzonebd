// lib/auth.ts - Authentication utilities and middleware
import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import prisma from './prisma';

export interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  userType?: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    userType: string;
    isActive: boolean;
  };
  error?: string;
}

/**
 * Extract JWT token from request headers
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = verify(token, jwtSecret) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Authenticate user from request
 * Returns user data if authentication is successful
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  const token = getTokenFromRequest(request);

  if (!token) {
    return {
      success: false,
      error: 'No authentication token provided'
    };
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return {
      success: false,
      error: 'Invalid or expired token'
    };
  }

  try {
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userType: true,
        isActive: true,
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'User account is inactive'
      };
    }

    return {
      success: true,
      user
    };
  } catch (error) {
    return {
      success: false,
      error: 'Database error during authentication'
    };
  }
}

/**
 * Require authentication - returns user or throws error response
 */
export async function requireAuth(request: NextRequest): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  userType: string;
  isActive: boolean;
}> {
  const authResult = await authenticateUser(request);

  if (!authResult.success || !authResult.user) {
    throw new Response(
      JSON.stringify({ error: authResult.error || 'Authentication failed' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return authResult.user;
}

/**
 * Require admin authentication
 */
export async function requireAdmin(request: NextRequest): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  userType: string;
  isActive: boolean;
}> {
  const user = await requireAuth(request);

  if (user.role !== 'ADMIN') {
    throw new Response(
      JSON.stringify({ error: 'Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: { role: string }, requiredRole: string | string[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  return user.role === requiredRole;
}

/**
 * Check if user is wholesale/B2B
 */
export function isWholesaleUser(user: { userType: string }): boolean {
  return user.userType === 'WHOLESALE';
}

/**
 * Check if user is retail/B2C
 */
export function isRetailUser(user: { userType: string }): boolean {
  return user.userType === 'RETAIL';
}
