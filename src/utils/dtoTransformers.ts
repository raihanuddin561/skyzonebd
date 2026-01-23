/**
 * DTO (Data Transfer Object) Transformers
 * 
 * Role-based data transformation to ensure sensitive financial data
 * (buying costs, profit margins, COGS) is never leaked to unauthorized users.
 */

import { UserRole } from '@prisma/client';

type User = {
  role: UserRole;
};

/**
 * Roles that can view cost data and profit information
 */
const COST_VIEWING_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'MANAGER'];

/**
 * Roles that can edit cost data
 */
const COST_EDITING_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Transform product for customer view (no cost data)
 * Removes all sensitive pricing and profit information
 */
export function transformProductForCustomer(product: any) {
  const {
    costPerUnit,
    basePrice,
    platformProfitPercentage,
    sellerProfit,
    calculatedProfit,
    sellerCommissionPercentage,
    shippingCost,
    handlingCost,
    sellerId,
    ...safeProduct
  } = product;
  
  return safeProduct;
}

/**
 * Transform product for admin view (all fields visible)
 */
export function transformProductForAdmin(product: any) {
  return product; // Admin sees everything
}

/**
 * Transform product based on user role
 */
export function transformProduct(product: any, user?: User) {
  if (!user) {
    return transformProductForCustomer(product);
  }
  
  const role = user.role;
  
  // Roles that can see cost data
  if (COST_VIEWING_ROLES.includes(role)) {
    return transformProductForAdmin(product);
  }
  
  // Everyone else sees customer view
  return transformProductForCustomer(product);
}

/**
 * Transform array of products
 */
export function transformProducts(products: any[], user?: User) {
  return products.map(product => transformProduct(product, user));
}

/**
 * Transform order for customer (no profit data)
 * Removes COGS, profit margins, and internal cost information
 */
export function transformOrderForCustomer(order: any) {
  const {
    totalCost,
    grossProfit,
    platformProfit,
    sellerProfit,
    profitMargin,
    internalNotes,
    ...safeOrder
  } = order;
  
  // Transform order items
  if (order.orderItems) {
    safeOrder.orderItems = order.orderItems.map((item: any) => {
      const {
        costPerUnit,
        profitPerUnit,
        totalProfit,
        profitMargin,
        ...safeItem
      } = item;
      return safeItem;
    });
  }
  
  return safeOrder;
}

/**
 * Transform order for admin (all fields visible)
 */
export function transformOrderForAdmin(order: any) {
  return order;
}

/**
 * Transform order based on user role
 */
export function transformOrder(order: any, user?: User) {
  if (!user) {
    return transformOrderForCustomer(order);
  }
  
  const role = user.role;
  
  // Roles that can see profit data
  if (COST_VIEWING_ROLES.includes(role)) {
    return transformOrderForAdmin(order);
  }
  
  return transformOrderForCustomer(order);
}

/**
 * Transform array of orders
 */
export function transformOrders(orders: any[], user?: User) {
  return orders.map(order => transformOrder(order, user));
}

/**
 * Transform stock lot for different roles
 * Only admin/manager can see detailed cost information
 */
export function transformStockLot(lot: any, user?: User) {
  if (!user || !COST_VIEWING_ROLES.includes(user.role)) {
    // Non-authorized users shouldn't access stock lots at all
    throw new Error('Unauthorized access to stock lot information');
  }
  
  return lot; // Authorized users see everything
}

/**
 * Transform payment information
 * Customers can see their own payments, admins see all details
 */
export function transformPayment(payment: any, user?: User, isOwner: boolean = false) {
  // Customers can see basic payment info for their own orders
  if (!user || (user.role === 'BUYER' && isOwner)) {
    const {
      receivedBy,
      approvedBy,
      gatewayResponse,
      ...safePayment
    } = payment;
    return safePayment;
  }
  
  // Admin sees everything
  if (COST_VIEWING_ROLES.includes(user.role)) {
    return payment;
  }
  
  // Others have no access
  throw new Error('Unauthorized access to payment information');
}

/**
 * Transform profit report (admin only)
 */
export function transformProfitReport(report: any, user?: User) {
  if (!user || !COST_VIEWING_ROLES.includes(user.role)) {
    throw new Error('Unauthorized access to profit reports');
  }
  
  return report;
}

/**
 * Transform operational cost/expense (admin only)
 */
export function transformOperationalCost(cost: any, user?: User) {
  if (!user || !COST_VIEWING_ROLES.includes(user.role)) {
    throw new Error('Unauthorized access to operational costs');
  }
  
  return cost;
}

/**
 * Check if user can view cost data
 */
export function canViewCostData(user?: User): boolean {
  if (!user) return false;
  return COST_VIEWING_ROLES.includes(user.role);
}

/**
 * Check if user can edit cost data
 */
export function canEditCostData(user?: User): boolean {
  if (!user) return false;
  return COST_EDITING_ROLES.includes(user.role);
}

/**
 * Check if user can view profit reports
 */
export function canViewProfitReports(user?: User): boolean {
  if (!user) return false;
  return COST_VIEWING_ROLES.includes(user.role);
}

/**
 * Check if user can manage inventory
 */
export function canManageInventory(user?: User): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
}

/**
 * Check if user can approve expenses
 */
export function canApproveExpenses(user?: User): boolean {
  if (!user) return false;
  return COST_EDITING_ROLES.includes(user.role);
}

/**
 * Check if user can create orders on behalf of customers
 */
export function canCreateOrdersForCustomers(user?: User): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SELLER'].includes(user.role);
}

/**
 * Check if user is admin or super admin
 */
export function isAdmin(user?: User): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
}

/**
 * Transform financial ledger entry (admin only)
 */
export function transformLedgerEntry(entry: any, user?: User) {
  if (!user || !COST_VIEWING_ROLES.includes(user.role)) {
    throw new Error('Unauthorized access to financial ledger');
  }
  
  return entry;
}

/**
 * Transform dashboard financial data (admin only)
 */
export function transformFinancialDashboard(data: any, user?: User) {
  if (!user || !COST_VIEWING_ROLES.includes(user.role)) {
    throw new Error('Unauthorized access to financial dashboard');
  }
  
  return data;
}

/**
 * Get allowed fields for a role
 * Returns list of field names that can be queried/displayed
 */
export function getAllowedProductFields(user?: User): string[] {
  const baseFields = [
    'id', 'name', 'slug', 'description', 'imageUrl', 'imageUrls', 'thumbnailUrl',
    'brand', 'tags', 'specifications', 'unit', 'wholesalePrice', 'moq',
    'stockQuantity', 'availability', 'sku', 'categoryId', 'isActive',
    'isFeatured', 'rating', 'reviewCount', 'createdAt', 'updatedAt'
  ];
  
  if (user && COST_VIEWING_ROLES.includes(user.role)) {
    return [
      ...baseFields,
      'basePrice', 'costPerUnit', 'platformProfitPercentage', 'calculatedProfit',
      'sellerProfit', 'sellerCommissionPercentage', 'shippingCost', 'handlingCost',
      'sellerId'
    ];
  }
  
  return baseFields;
}

/**
 * Get allowed order fields for a role
 */
export function getAllowedOrderFields(user?: User): string[] {
  const baseFields = [
    'id', 'orderNumber', 'userId', 'guestName', 'guestPhone', 'guestEmail',
    'subtotal', 'tax', 'shipping', 'total', 'status', 'paymentStatus',
    'paymentMethod', 'shippingAddress', 'billingAddress', 'notes',
    'createdAt', 'updatedAt'
  ];
  
  if (user && COST_VIEWING_ROLES.includes(user.role)) {
    return [
      ...baseFields,
      'totalCost', 'grossProfit', 'platformProfit', 'sellerProfit',
      'profitMargin', 'internalNotes'
    ];
  }
  
  return baseFields;
}

/**
 * Create safe select object for Prisma queries
 */
export function createProductSelect(user?: User) {
  const fields = getAllowedProductFields(user);
  const select: any = {};
  fields.forEach(field => {
    select[field] = true;
  });
  return select;
}

/**
 * Create safe select object for order queries
 */
export function createOrderSelect(user?: User) {
  const fields = getAllowedOrderFields(user);
  const select: any = {};
  fields.forEach(field => {
    select[field] = true;
  });
  return select;
}
