// lib/permissions.ts - Permission Utilities

import { UserRole, PermissionModule, hasPermission, isSuperAdmin, isAdmin, isPartner, ROLE_HIERARCHY } from '@/types/roles';

/**
 * Permission check for API routes
 */
export function requirePermission(
  userRole: UserRole,
  permission: PermissionModule,
  options?: { allowSuperAdminOverride?: boolean }
): boolean {
  const { allowSuperAdminOverride = true } = options || {};
  
  // Super admin can override if enabled
  if (allowSuperAdminOverride && isSuperAdmin(userRole)) {
    return true;
  }
  
  return hasPermission(userRole, permission);
}

/**
 * Require super admin access
 */
export function requireSuperAdmin(userRole: UserRole): boolean {
  return isSuperAdmin(userRole);
}

/**
 * Require admin or higher
 */
export function requireAdmin(userRole: UserRole): boolean {
  return isAdmin(userRole);
}

/**
 * Require partner or higher
 */
export function requirePartner(userRole: UserRole): boolean {
  return isPartner(userRole);
}

/**
 * Can override percentage limits (super admin only)
 */
export function canOverridePercentage(userRole: UserRole): boolean {
  return isSuperAdmin(userRole);
}

/**
 * Can edit partner percentages
 */
export function canEditPartnerPercentage(userRole: UserRole): boolean {
  return isSuperAdmin(userRole) || 
         hasPermission(userRole, PermissionModule.PARTNER_PERCENTAGE_EDIT);
}

/**
 * Can view profit dashboard
 */
export function canViewProfitDashboard(userRole: UserRole): boolean {
  return isPartner(userRole) || // Partners and above
         hasPermission(userRole, PermissionModule.PROFIT_VIEW);
}

/**
 * Can manage partners
 */
export function canManagePartners(userRole: UserRole): boolean {
  return isAdmin(userRole) || // Admin and above
         hasPermission(userRole, PermissionModule.PARTNERS_MANAGE);
}

/**
 * Can approve costs
 */
export function canApproveCosts(userRole: UserRole): boolean {
  return isAdmin(userRole) ||
         hasPermission(userRole, PermissionModule.COSTS_APPROVE);
}

/**
 * Can manage profit distributions
 */
export function canManageProfitDistributions(userRole: UserRole): boolean {
  return isAdmin(userRole) ||
         hasPermission(userRole, PermissionModule.PROFIT_DISTRIBUTION_MANAGE);
}

/**
 * Can view all orders
 */
export function canViewAllOrders(userRole: UserRole): boolean {
  return hasPermission(userRole, PermissionModule.ORDERS_VIEW_ALL);
}

/**
 * Can export data
 */
export function canExportData(userRole: UserRole): boolean {
  return hasPermission(userRole, PermissionModule.DATA_EXPORT);
}

/**
 * Can manage users
 */
export function canManageUsers(userRole: UserRole): boolean {
  return isAdmin(userRole);
}

/**
 * Can assign roles
 */
export function canAssignRoles(userRole: UserRole, targetRole: UserRole): boolean {
  // Only super admin can assign super admin role
  if (targetRole === UserRole.SUPER_ADMIN) {
    return isSuperAdmin(userRole);
  }
  
  // Admin can assign roles below admin
  if (isAdmin(userRole) && ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[UserRole.ADMIN]) {
    return true;
  }
  
  // Super admin can assign any role
  return isSuperAdmin(userRole);
}

/**
 * Get accessible roles for assignment
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  if (isSuperAdmin(userRole)) {
    return Object.values(UserRole);
  }
  
  if (isAdmin(userRole)) {
    return [
      UserRole.PARTNER,
      UserRole.MANAGER,
      UserRole.SELLER,
      UserRole.BUYER,
      UserRole.GUEST
    ];
  }
  
  return [];
}

/**
 * Check if user can perform action on target user
 */
export function canManageUser(userRole: UserRole, targetUserRole: UserRole): boolean {
  // Super admin can manage anyone
  if (isSuperAdmin(userRole)) {
    return true;
  }
  
  // Admin can manage users below admin level
  if (isAdmin(userRole) && ROLE_HIERARCHY[targetUserRole] < ROLE_HIERARCHY[UserRole.ADMIN]) {
    return true;
  }
  
  return false;
}

/**
 * Validate percentage limits with role check
 */
export function validatePercentageLimit(
  userRole: UserRole,
  newPercentage: number,
  currentTotal: number,
  existingPercentage: number = 0
): { valid: boolean; error?: string } {
  // Super admin can override percentage limits
  if (canOverridePercentage(userRole)) {
    return { valid: true };
  }
  
  // Calculate new total
  const projectedTotal = currentTotal - existingPercentage + newPercentage;
  
  if (projectedTotal > 100) {
    return {
      valid: false,
      error: `Total partner share would be ${projectedTotal.toFixed(1)}%. Maximum is 100%. Contact super admin for override.`
    };
  }
  
  return { valid: true };
}

/**
 * Get permission description
 */
export function getPermissionDescription(permission: PermissionModule): string {
  const descriptions: Partial<Record<PermissionModule, string>> = {
    [PermissionModule.DASHBOARD_VIEW]: 'View dashboard and analytics',
    [PermissionModule.PROFIT_VIEW]: 'View profit reports and financial data',
    [PermissionModule.PROFIT_MANAGE]: 'Manage profit calculations and reports',
    [PermissionModule.PARTNERS_VIEW]: 'View partner information',
    [PermissionModule.PARTNERS_MANAGE]: 'Create and manage partners',
    [PermissionModule.PARTNER_PERCENTAGE_EDIT]: 'Edit partner profit share percentages',
    [PermissionModule.PARTNER_PERCENTAGE_OVERRIDE]: 'Override percentage limits (Super Admin only)',
    [PermissionModule.COSTS_VIEW]: 'View operational costs',
    [PermissionModule.COSTS_MANAGE]: 'Manage operational costs',
    [PermissionModule.COSTS_APPROVE]: 'Approve cost expenses',
    [PermissionModule.PRODUCTS_VIEW]: 'View products',
    [PermissionModule.PRODUCTS_MANAGE]: 'Manage products',
    [PermissionModule.ORDERS_VIEW]: 'View orders',
    [PermissionModule.ORDERS_VIEW_ALL]: 'View all customer orders',
    [PermissionModule.ORDERS_MANAGE]: 'Manage and process orders',
    [PermissionModule.USERS_VIEW]: 'View user list',
    [PermissionModule.USERS_MANAGE]: 'Manage user accounts',
    [PermissionModule.ROLES_MANAGE]: 'Assign and manage user roles',
    [PermissionModule.SYSTEM_CONFIG]: 'Configure system settings'
  };
  
  return descriptions[permission] || permission;
}
