// utils/permissions.ts - Permission Management Utilities

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export interface PermissionActions {
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canExport?: boolean;
}

export interface RolePermission {
  module: string;
  actions: PermissionActions;
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(
  userId: string,
  module: string,
  action: PermissionAction
): Promise<boolean> {
  try {
    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true }
    });
    
    if (!user || !user.isActive) {
      return false;
    }
    
    // Super admin has all permissions
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Check specific permission
    const permission = await prisma.userPermission.findUnique({
      where: {
        userId_module: {
          userId,
          module: module as any
        }
      }
    });
    
    if (!permission) {
      return false;
    }
    
    // Check if permission is expired
    if (permission.expiresAt && permission.expiresAt < new Date()) {
      return false;
    }
    
    // Map action to permission field
    switch (action) {
      case 'view':
        return permission.canView;
      case 'create':
        return permission.canCreate;
      case 'edit':
        return permission.canEdit;
      case 'delete':
        return permission.canDelete;
      case 'approve':
        return permission.canApprove;
      case 'export':
        return permission.canExport;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check multiple permissions at once
 */
export async function hasAnyPermission(
  userId: string,
  checks: Array<{ module: string; action: PermissionAction }>
): Promise<boolean> {
  for (const check of checks) {
    const hasAccess = await hasPermission(userId, check.module, check.action);
    if (hasAccess) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  checks: Array<{ module: string; action: PermissionAction }>
): Promise<boolean> {
  for (const check of checks) {
    const hasAccess = await hasPermission(userId, check.module, check.action);
    if (!hasAccess) {
      return false;
    }
  }
  return true;
}

/**
 * Grant permission to user
 */
export async function grantPermission(
  userId: string,
  module: string,
  permissions: {
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canExport?: boolean;
  },
  grantedBy: string,
  expiresAt?: Date
) {
  return await prisma.userPermission.upsert({
    where: {
      userId_module: {
        userId,
        module: module as any
      }
    },
    create: {
      userId,
      module: module as any,
      canView: permissions.canView || false,
      canCreate: permissions.canCreate || false,
      canEdit: permissions.canEdit || false,
      canDelete: permissions.canDelete || false,
      canApprove: permissions.canApprove || false,
      canExport: permissions.canExport || false,
      grantedBy,
      expiresAt
    },
    update: {
      canView: permissions.canView,
      canCreate: permissions.canCreate,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canApprove: permissions.canApprove,
      canExport: permissions.canExport,
      grantedBy,
      expiresAt
    }
  });
}

/**
 * Revoke permission from user
 */
export async function revokePermission(
  userId: string,
  module: string
): Promise<void> {
  await prisma.userPermission.delete({
    where: {
      userId_module: {
        userId,
        module: module as any
      }
    }
  }).catch(() => {
    // Permission doesn't exist, ignore
  });
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true }
  });
  
  if (!user || !user.isActive) {
    return [];
  }
  
  // Super admin has all permissions
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return getAllPermissionModules().map(module => ({
      module,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canApprove: true,
      canExport: true
    }));
  }
  
  return await prisma.userPermission.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }
  });
}

/**
 * Grant role-based permissions (predefined sets)
 */
export async function grantRolePermissions(
  userId: string,
  roleType: 'INVENTORY_MANAGER' | 'HR_MANAGER' | 'FINANCE_MANAGER' | 'SALES_MANAGER' | 'OPERATIONS_MANAGER',
  grantedBy: string
) {
  const rolePermissions = getRolePermissions(roleType);
  
  const promises = rolePermissions.map(perm =>
    grantPermission(userId, perm.module, perm.actions, grantedBy)
  );
  
  await Promise.all(promises);
}

/**
 * Predefined role permission sets
 */
function getRolePermissions(roleType: string): RolePermission[] {
  const roles: Record<string, RolePermission[]> = {
    INVENTORY_MANAGER: [
      {
        module: 'INVENTORY_VIEW',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'INVENTORY_MANAGE',
        actions: { canView: true, canCreate: true, canEdit: true }
      },
      {
        module: 'INVENTORY_REPORTS',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'PRODUCTS_VIEW',
        actions: { canView: true }
      },
      {
        module: 'PRODUCTS_MANAGE',
        actions: { canView: true, canEdit: true }
      }
    ],
    HR_MANAGER: [
      {
        module: 'EMPLOYEES_VIEW',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'EMPLOYEES_MANAGE',
        actions: { canView: true, canCreate: true, canEdit: true, canDelete: true }
      },
      {
        module: 'EMPLOYEES_REPORTS',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'SALARIES_VIEW',
        actions: { canView: true }
      },
      {
        module: 'SALARIES_MANAGE',
        actions: { canView: true, canCreate: true, canEdit: true }
      },
      {
        module: 'SALARIES_PROCESS',
        actions: { canView: true, canCreate: true }
      }
    ],
    FINANCE_MANAGER: [
      {
        module: 'SALARIES_VIEW',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'SALARIES_MANAGE',
        actions: { canView: true, canCreate: true, canEdit: true }
      },
      {
        module: 'SALARIES_APPROVE',
        actions: { canView: true, canApprove: true }
      },
      {
        module: 'COSTS_VIEW',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'COSTS_MANAGE',
        actions: { canView: true, canCreate: true, canEdit: true, canDelete: true }
      },
      {
        module: 'COSTS_APPROVE',
        actions: { canView: true, canApprove: true }
      },
      {
        module: 'PROFIT_LOSS_VIEW',
        actions: { canView: true }
      },
      {
        module: 'PROFIT_LOSS_REPORTS',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'REPORTS_VIEW',
        actions: { canView: true }
      },
      {
        module: 'REPORTS_EXPORT',
        actions: { canView: true, canExport: true }
      }
    ],
    SALES_MANAGER: [
      {
        module: 'ORDERS_VIEW',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'ORDERS_MANAGE',
        actions: { canView: true, canEdit: true }
      },
      {
        module: 'ORDERS_PROCESS',
        actions: { canView: true, canCreate: true, canEdit: true }
      },
      {
        module: 'CUSTOMERS_VIEW',
        actions: { canView: true, canExport: true }
      },
      {
        module: 'CUSTOMERS_MANAGE',
        actions: { canView: true, canEdit: true }
      },
      {
        module: 'PRODUCTS_VIEW',
        actions: { canView: true }
      }
    ],
    OPERATIONS_MANAGER: [
      {
        module: 'INVENTORY_VIEW',
        actions: { canView: true }
      },
      {
        module: 'ORDERS_VIEW',
        actions: { canView: true }
      },
      {
        module: 'ORDERS_PROCESS',
        actions: { canView: true, canEdit: true }
      },
      {
        module: 'COSTS_VIEW',
        actions: { canView: true }
      },
      {
        module: 'REPORTS_VIEW',
        actions: { canView: true }
      }
    ]
  };
  
  return roles[roleType] || [];
}

/**
 * Get all available permission modules
 */
function getAllPermissionModules(): string[] {
  return [
    'INVENTORY_VIEW',
    'INVENTORY_MANAGE',
    'INVENTORY_REPORTS',
    'EMPLOYEES_VIEW',
    'EMPLOYEES_MANAGE',
    'EMPLOYEES_REPORTS',
    'SALARIES_VIEW',
    'SALARIES_MANAGE',
    'SALARIES_PROCESS',
    'SALARIES_APPROVE',
    'COSTS_VIEW',
    'COSTS_MANAGE',
    'COSTS_APPROVE',
    'PROFIT_LOSS_VIEW',
    'PROFIT_LOSS_REPORTS',
    'PRODUCTS_VIEW',
    'PRODUCTS_MANAGE',
    'ORDERS_VIEW',
    'ORDERS_MANAGE',
    'ORDERS_PROCESS',
    'CUSTOMERS_VIEW',
    'CUSTOMERS_MANAGE',
    'CATEGORIES_VIEW',
    'CATEGORIES_MANAGE',
    'USERS_VIEW',
    'USERS_MANAGE',
    'PERMISSIONS_MANAGE',
    'SETTINGS_VIEW',
    'SETTINGS_MANAGE',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
    'ANALYTICS_VIEW'
  ];
}

/**
 * Revoke all permissions for a user
 */
export async function revokeAllPermissions(userId: string): Promise<void> {
  await prisma.userPermission.deleteMany({
    where: { userId }
  });
}
