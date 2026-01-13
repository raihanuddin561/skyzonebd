'use client'

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  requiredRole?: string; // Optional: restrict by role (accepts uppercase database values or lowercase for backwards compatibility)
  allowedRoles?: string[]; // Optional: allow multiple roles
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login',
  requiredRole,
  allowedRoles
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Check authentication
      if (requireAuth && !isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // Check role if specified
      if (isAuthenticated && user) {
        const userRole = user.role?.toLowerCase();
        
        // Check required role (single role)
        if (requiredRole && userRole !== requiredRole.toLowerCase()) {
          router.push('/'); // Redirect to home if role doesn't match
          return;
        }

        // Check allowed roles (multiple roles)
        if (allowedRoles && allowedRoles.length > 0) {
          const hasAllowedRole = allowedRoles.some(
            role => role.toLowerCase() === userRole
          );
          if (!hasAllowedRole) {
            router.push('/'); // Redirect to home if role is not in allowed list
            return;
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, requiredRole, allowedRoles, user, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If auth is required and user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Check role access
  if (isAuthenticated && user) {
    const userRole = user.role?.toLowerCase();
    
    // Check required role
    if (requiredRole && userRole !== requiredRole.toLowerCase()) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    // Check allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some(
        role => role.toLowerCase() === userRole
      );
      if (!hasAllowedRole) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </div>
        );
      }
    }
  }

  return <>{children}</>;
}
