// src/lib/validation.ts - Zod validation schemas for all APIs

import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  userType: z.enum(['B2C', 'B2B']).default('B2C'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
});

// ==================== PRODUCT SCHEMAS ====================

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  basePrice: z.number().positive('Base price must be positive'),
  wholesalePrice: z.number().positive('Wholesale price must be positive').optional(),
  moq: z.number().int().positive('MOQ must be a positive integer').optional(),
  stock: z.number().int().nonnegative('Stock cannot be negative').default(0),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  tieredPricing: z.array(z.object({
    minQuantity: z.number().int().positive(),
    maxQuantity: z.number().int().positive().optional(),
    price: z.number().positive(),
  })).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
});

// ==================== ORDER SCHEMAS ====================

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().cuid('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().positive('Price must be positive'),
    discount: z.number().min(0).max(100).optional(),
  })).min(1, 'Order must contain at least one item'),
  shippingAddressId: z.string().cuid('Invalid address ID').optional(),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default('Bangladesh'),
  }).optional(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'BANK_TRANSFER', 'MOBILE_BANKING', 'CARD']).default('CASH_ON_DELIVERY'),
  notes: z.string().optional(),
  discountCode: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  notes: z.string().optional(),
});

export const orderIdSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
});

// ==================== REVIEW SCHEMAS ====================

export const createReviewSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000, 'Comment too long'),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(10).max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const reviewIdSchema = z.object({
  reviewId: z.string().cuid('Invalid review ID'),
});

// ==================== PROFIT SCHEMAS ====================

export const profitReportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  productId: z.string().cuid().optional(),
  partnerId: z.string().cuid().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
});

export const updateProfitMarginSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  costPrice: z.number().positive('Cost price must be positive'),
  partnerCommissionRate: z.number().min(0).max(100, 'Commission rate must be between 0 and 100').optional(),
});

// ==================== DELETION REQUEST SCHEMAS ====================

export const createDeletionRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  reason: z.string().max(1000, 'Reason too long').optional(),
});

export const approveDeletionRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().min(10).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.action !== 'reject' || (data.rejectionReason && data.rejectionReason.length > 0),
  {
    message: 'Rejection reason is required when rejecting a request',
    path: ['rejectionReason'],
  }
);

// ==================== RFQ SCHEMAS ====================

export const createRFQSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  message: z.string().min(20, 'Message must be at least 20 characters').max(2000),
  targetPrice: z.number().positive().optional(),
  deliveryDate: z.string().datetime().optional(),
});

export const respondToRFQSchema = z.object({
  rfqId: z.string().cuid('Invalid RFQ ID'),
  quotedPrice: z.number().positive('Quoted price must be positive'),
  message: z.string().min(10).max(2000),
  deliveryTime: z.string().optional(),
  validUntil: z.string().datetime().optional(),
});

// ==================== ADDRESS SCHEMAS ====================

export const createAddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  addressLine1: z.string().min(5, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Bangladesh'),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

// ==================== CATEGORY SCHEMAS ====================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  image: z.string().url().optional(),
  parentId: z.string().cuid().optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

// ==================== DISCOUNT SCHEMAS ====================

export const createDiscountSchema = z.object({
  code: z.string().min(3, 'Discount code must be at least 3 characters').max(50),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive('Discount value must be positive'),
  minOrderAmount: z.number().nonnegative().optional(),
  maxDiscount: z.number().positive().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  usageLimit: z.number().int().positive().optional(),
  applicableTo: z.enum(['ALL', 'B2C', 'B2B']).default('ALL'),
  isActive: z.boolean().default(true),
});

// ==================== PERMISSION SCHEMAS ====================

export const grantPermissionSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  resource: z.string().min(1, 'Resource is required'),
  actions: z.array(z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE'])).min(1, 'At least one action required'),
  scope: z.enum(['OWN', 'ALL']).default('OWN'),
});

// ==================== PAGINATION SCHEMAS ====================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== QUERY SCHEMAS ====================

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
}).merge(paginationSchema);

// ==================== VALIDATION HELPERS ====================

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    });
    
    throw new ValidationError('Validation failed', errors);
  }
  
  return result.data;
}

export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): T {
  const data: Record<string, any> = {};
  
  searchParams.forEach((value, key) => {
    // Try to parse numbers and booleans
    if (value === 'true') {
      data[key] = true;
    } else if (value === 'false') {
      data[key] = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      data[key] = Number(value);
    } else {
      data[key] = value;
    }
  });
  
  return validateData(schema, data);
}

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateRFQInput = z.infer<typeof createRFQSchema>;
export type ProfitReportQuery = z.infer<typeof profitReportQuerySchema>;
export type CreateDeletionRequestInput = z.infer<typeof createDeletionRequestSchema>;
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
