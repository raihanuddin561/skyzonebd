// types/roles.ts - Role-Based Access Control System

/**
 * System Roles with Hierarchy
 * SUPER_ADMIN (Level 5) > ADMIN (Level 4) > PARTNER (Level 3) > MANAGER (Level 2) > BUYER (Level 1)
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',    // Full system access, can override all rules
  ADMIN = 'ADMIN',                // Admin access, manage operations
  PARTNER = 'PARTNER',            // Partner with elevated permissions + profit sharing
  MANAGER = 'MANAGER',            // Manager level access
  BUYER = 'BUYER',                // Regular user/buyer
  SELLER = 'SELLER',              // Seller/Vendor
  GUEST = 'GUEST'                 // Guest user
}

export const ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  PARTNER: 3,
  MANAGER: 2,
  SELLER: 2,
  BUYER: 1,
  GUEST: 0
};

/**
 * Permission Modules
 */
export enum PermissionModule {
  // Dashboard & Analytics
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',
  ANALYTICS_VIEW = 'ANALYTICS_VIEW',
  REPORTS_VIEW = 'REPORTS_VIEW',
  REPORTS_EXPORT = 'REPORTS_EXPORT',
  
  // Financial Management
  PROFIT_VIEW = 'PROFIT_VIEW',
  PROFIT_MANAGE = 'PROFIT_MANAGE',
  COSTS_VIEW = 'COSTS_VIEW',
  COSTS_MANAGE = 'COSTS_MANAGE',
  COSTS_APPROVE = 'COSTS_APPROVE',
  
  // Partnership Management
  PARTNERS_VIEW = 'PARTNERS_VIEW',
  PARTNERS_MANAGE = 'PARTNERS_MANAGE',
  PARTNER_PERCENTAGE_EDIT = 'PARTNER_PERCENTAGE_EDIT',
  PARTNER_PERCENTAGE_OVERRIDE = 'PARTNER_PERCENTAGE_OVERRIDE', // Super admin only
  PROFIT_DISTRIBUTION_VIEW = 'PROFIT_DISTRIBUTION_VIEW',
  PROFIT_DISTRIBUTION_MANAGE = 'PROFIT_DISTRIBUTION_MANAGE',
  
  // Product Management
  PRODUCTS_VIEW = 'PRODUCTS_VIEW',
  PRODUCTS_CREATE = 'PRODUCTS_CREATE',
  PRODUCTS_EDIT = 'PRODUCTS_EDIT',
  PRODUCTS_DELETE = 'PRODUCTS_DELETE',
  PRODUCTS_APPROVE = 'PRODUCTS_APPROVE',
  PRODUCTS_MANAGE = 'PRODUCTS_MANAGE', // Composite: Create + Edit + Delete
  
  // Order Management
  ORDERS_VIEW = 'ORDERS_VIEW',
  ORDERS_VIEW_ALL = 'ORDERS_VIEW_ALL',
  ORDERS_MANAGE = 'ORDERS_MANAGE',
  ORDERS_PROCESS = 'ORDERS_PROCESS',
  ORDERS_CANCEL = 'ORDERS_CANCEL',
  
  // Customer Management
  CUSTOMERS_VIEW = 'CUSTOMERS_VIEW',
  CUSTOMERS_MANAGE = 'CUSTOMERS_MANAGE',
  CUSTOMER_DISCOUNT_VIEW = 'CUSTOMER_DISCOUNT_VIEW',
  CUSTOMER_DISCOUNT_MANAGE = 'CUSTOMER_DISCOUNT_MANAGE',
  
  // User Management
  USERS_VIEW = 'USERS_VIEW',
  USERS_CREATE = 'USERS_CREATE',
  USERS_EDIT = 'USERS_EDIT',
  USERS_DELETE = 'USERS_DELETE',
  USERS_SUSPEND = 'USERS_SUSPEND',
  USERS_MANAGE = 'USERS_MANAGE', // Composite: Create + Edit + Delete + Suspend
  ROLES_MANAGE = 'ROLES_MANAGE',
  
  // Employee Management
  EMPLOYEES_VIEW = 'EMPLOYEES_VIEW',
  EMPLOYEES_MANAGE = 'EMPLOYEES_MANAGE',
  SALARIES_VIEW = 'SALARIES_VIEW',
  SALARIES_MANAGE = 'SALARIES_MANAGE',
  SALARIES_APPROVE = 'SALARIES_APPROVE',
  
  // Inventory Management
  INVENTORY_VIEW = 'INVENTORY_VIEW',
  INVENTORY_MANAGE = 'INVENTORY_MANAGE',
  
  // Settings
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_MANAGE = 'SETTINGS_MANAGE',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  
  // Advanced Features
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETE = 'DATA_DELETE',
  AUDIT_LOGS_VIEW = 'AUDIT_LOGS_VIEW',
  BACKUP_RESTORE = 'BACKUP_RESTORE'
}

/**
 * Role Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionModule[]> = {
  // SUPER_ADMIN - All permissions
  SUPER_ADMIN: Object.values(PermissionModule),
  
  // ADMIN - Most permissions except super admin overrides
  ADMIN: [
    PermissionModule.DASHBOARD_VIEW,
    PermissionModule.ANALYTICS_VIEW,
    PermissionModule.REPORTS_VIEW,
    PermissionModule.REPORTS_EXPORT,
    PermissionModule.PROFIT_VIEW,
    PermissionModule.PROFIT_MANAGE,
    PermissionModule.COSTS_VIEW,
    PermissionModule.COSTS_MANAGE,
    PermissionModule.COSTS_APPROVE,
    PermissionModule.PARTNERS_VIEW,
    PermissionModule.PARTNERS_MANAGE,
    PermissionModule.PARTNER_PERCENTAGE_EDIT,
    PermissionModule.PROFIT_DISTRIBUTION_VIEW,
    PermissionModule.PROFIT_DISTRIBUTION_MANAGE,
    PermissionModule.PRODUCTS_VIEW,
    PermissionModule.PRODUCTS_CREATE,
    PermissionModule.PRODUCTS_EDIT,
    PermissionModule.PRODUCTS_DELETE,
    PermissionModule.PRODUCTS_APPROVE,
    PermissionModule.ORDERS_VIEW,
    PermissionModule.ORDERS_VIEW_ALL,
    PermissionModule.ORDERS_MANAGE,
    PermissionModule.ORDERS_PROCESS,
    PermissionModule.ORDERS_CANCEL,
    PermissionModule.CUSTOMERS_VIEW,
    PermissionModule.CUSTOMERS_MANAGE,
    PermissionModule.CUSTOMER_DISCOUNT_VIEW,
    PermissionModule.CUSTOMER_DISCOUNT_MANAGE,
    PermissionModule.USERS_VIEW,
    PermissionModule.USERS_CREATE,
    PermissionModule.USERS_EDIT,
    PermissionModule.USERS_SUSPEND,
    PermissionModule.EMPLOYEES_VIEW,
    PermissionModule.EMPLOYEES_MANAGE,
    PermissionModule.SALARIES_VIEW,
    PermissionModule.SALARIES_MANAGE,
    PermissionModule.INVENTORY_VIEW,
    PermissionModule.INVENTORY_MANAGE,
    PermissionModule.SETTINGS_VIEW,
    PermissionModule.DATA_EXPORT,
    PermissionModule.AUDIT_LOGS_VIEW
  ],
  
  // PARTNER - Financial + Dashboard access (elevated from regular user)
  PARTNER: [
    PermissionModule.DASHBOARD_VIEW,
    PermissionModule.ANALYTICS_VIEW,
    PermissionModule.REPORTS_VIEW,
    PermissionModule.REPORTS_EXPORT,
    PermissionModule.PROFIT_VIEW,
    PermissionModule.PROFIT_DISTRIBUTION_VIEW,
    PermissionModule.COSTS_VIEW,
    PermissionModule.PARTNERS_VIEW,
    PermissionModule.PRODUCTS_VIEW,
    PermissionModule.ORDERS_VIEW,
    PermissionModule.ORDERS_VIEW_ALL,
    PermissionModule.CUSTOMERS_VIEW,
    PermissionModule.EMPLOYEES_VIEW,
    PermissionModule.SALARIES_VIEW,
    PermissionModule.INVENTORY_VIEW,
    PermissionModule.DATA_EXPORT
  ],
  
  // MANAGER - Operations management
  MANAGER: [
    PermissionModule.DASHBOARD_VIEW,
    PermissionModule.PRODUCTS_VIEW,
    PermissionModule.PRODUCTS_CREATE,
    PermissionModule.PRODUCTS_EDIT,
    PermissionModule.ORDERS_VIEW,
    PermissionModule.ORDERS_VIEW_ALL,
    PermissionModule.ORDERS_MANAGE,
    PermissionModule.ORDERS_PROCESS,
    PermissionModule.CUSTOMERS_VIEW,
    PermissionModule.INVENTORY_VIEW,
    PermissionModule.INVENTORY_MANAGE,
    PermissionModule.REPORTS_VIEW
  ],
  
  // SELLER - Product and order management
  SELLER: [
    PermissionModule.DASHBOARD_VIEW,
    PermissionModule.PRODUCTS_VIEW,
    PermissionModule.PRODUCTS_CREATE,
    PermissionModule.PRODUCTS_EDIT,
    PermissionModule.ORDERS_VIEW,
    PermissionModule.INVENTORY_VIEW
  ],
  
  // BUYER - Basic user permissions
  BUYER: [
    PermissionModule.PRODUCTS_VIEW,
    PermissionModule.ORDERS_VIEW
  ],
  
  // GUEST - Minimal permissions
  GUEST: [
    PermissionModule.PRODUCTS_VIEW
  ]
};

/**
 * Check if user has permission
 */
export function hasPermission(userRole: UserRole, permission: PermissionModule): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: PermissionModule[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if user has all permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: PermissionModule[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Check if role has higher or equal level than required role
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.SUPER_ADMIN;
}

/**
 * Check if user is admin or higher
 */
export function isAdmin(userRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[UserRole.ADMIN];
}

/**
 * Check if user is partner or higher
 */
export function isPartner(userRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[UserRole.PARTNER];
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Administrator',
    ADMIN: 'Administrator',
    PARTNER: 'Business Partner',
    MANAGER: 'Manager',
    SELLER: 'Seller',
    BUYER: 'Buyer',
    GUEST: 'Guest'
  };
  return roleNames[role] || role;
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    PARTNER: 'bg-green-100 text-green-800',
    MANAGER: 'bg-yellow-100 text-yellow-800',
    SELLER: 'bg-orange-100 text-orange-800',
    BUYER: 'bg-gray-100 text-gray-800',
    GUEST: 'bg-gray-50 text-gray-600'
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Permission Check Result
 */
export interface PermissionCheck {
  granted: boolean;
  reason?: string;
}

/**
 * Advanced permission checker with reasoning
 */
export function checkPermission(
  userRole: UserRole,
  permission: PermissionModule,
  context?: Record<string, unknown>
): PermissionCheck {
  // Super admin always has access
  if (isSuperAdmin(userRole)) {
    return { granted: true, reason: 'Super admin access' };
  }
  
  // Check role-based permission
  if (hasPermission(userRole, permission)) {
    return { granted: true, reason: 'Role-based access' };
  }
  
  return { 
    granted: false, 
    reason: `Permission '${permission}' not granted for role '${userRole}'` 
  };
}
