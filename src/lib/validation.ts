// src/lib/validation.ts - Zod validation schemas for all APIs

import { z } from 'zod';
// Deriving Zod enum schemas from the real Prisma-generated enums (via
// z.nativeEnum) instead of hand-typed string-literal lists wherever
// possible — this file's schemas drifted from the real schema/routes
// repeatedly (see 14_Technical_Debt.md §17) precisely because hand-copied
// literal unions have nothing keeping them in sync when the source enum
// changes. z.nativeEnum ties validation directly to the same source of
// truth as the database, so it can't silently go stale again.
import { OrderStatus, AddressType, ReviewStatus, PermissionModule } from '@prisma/client';

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().min(1, 'Company name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  // Fixed to match the real UserType enum (RETAIL/WHOLESALE/SELLER/ADMIN/GUEST)
  // — previously had invented values ('B2C'/'B2B') that don't exist anywhere
  // in the schema. Note: the live register route (auth/register/route.ts)
  // does not currently accept a userType from the request at all — it
  // hardcodes every new account to role: 'BUYER', userType: 'RETAIL'.
  // This field is included for schema completeness/future use but isn't
  // wired to any behavior yet.
  userType: z.enum(['RETAIL', 'WHOLESALE']).optional(),
});

// Fixed to match the real route (user/profile/route.ts PUT — note it's PUT,
// not PATCH; PATCH on that same route is a separate password-change
// endpoint) — added the missing `companyName` field and made name/email/
// phone required, since the route itself rejects the request if any of
// the three is falsy rather than treating them as independently optional.
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  companyName: z.string().optional(),
});

// ==================== PRODUCT SCHEMAS ====================

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  basePrice: z.number().positive('Base price must be positive'),
  wholesalePrice: z.number().positive('Wholesale price must be positive').optional(),
  moq: z.number().int().positive('MOQ must be a positive integer').optional(),
  // Fixed field names to match the real Product model/route
  // (products/route.ts) — was `stock`/`images`/`unitId`/`tieredPricing`,
  // none of which exist; the real fields are `stockQuantity`, `imageUrl`
  // (required) + `imageUrls` (additional gallery images), `unit` (a plain
  // string symbol, no `unitId` FK exists), and `wholesaleTiers`.
  // `shortDescription` was also removed — no such field exists.
  stockQuantity: z.number().int().nonnegative('Stock cannot be negative').default(0),
  categoryId: z.string().optional(),
  unit: z.string().optional(),
  imageUrl: z.string().min(1, 'Primary image is required'),
  imageUrls: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  wholesaleTiers: z.array(z.object({
    minQuantity: z.number().int().positive(),
    maxQuantity: z.number().int().positive().optional(),
    price: z.number().positive(),
    discount: z.number().min(0).max(100).optional(),
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
  // Fixed to match the real, live values the checkout page actually sends
  // (lowercase snake_case) — Order.paymentMethod is a plain, unconstrained
  // String column (the schema.prisma PaymentMethod enum exists but is
  // orphaned, used by zero fields — see 14_Technical_Debt.md), so this is
  // an app-level convention, not a database-enforced one. The previous
  // values here ('CASH_ON_DELIVERY', 'MOBILE_BANKING', 'CARD') don't match
  // anything the frontend or backend actually uses.
  paymentMethod: z.enum(['cash_on_delivery', 'bank_transfer', 'bkash']).default('cash_on_delivery'),
  notes: z.string().optional(),
  discountCode: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  // z.nativeEnum(OrderStatus) — was a hand-typed list previously missing
  // PACKED, IN_TRANSIT, and RETURNED (would have rejected valid real
  // status transitions had this schema been adopted); now derived directly
  // from the real enum so it can't drift again.
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
});

export const orderIdSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
});

// ==================== REVIEW SCHEMAS ====================

// Fixed to include `orderId` — the real route (reviews/route.ts POST)
// requires it (the Review model's uniqueness constraint is on
// [userId, productId, orderId] — a review is tied to a specific verified
// purchase, not just a product), and it was missing entirely. Added the
// optional `title` field the route also accepts.
export const createReviewSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  orderId: z.string().cuid('Invalid order ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().optional(),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000, 'Comment too long'),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional(),
});

// There is no user-facing "edit my review" endpoint — the only real
// review-update route is admin moderation (admin/reviews/[id]/route.ts
// PATCH), which reads { status, moderationNote }, not rating/comment/
// images. Repurposed to match what actually exists rather than an
// invented customer-editing flow.
export const updateReviewSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
  moderationNote: z.string().optional(),
});

export const reviewIdSchema = z.object({
  reviewId: z.string().cuid('Invalid review ID'),
});

// ==================== PROFIT SCHEMAS ====================

// `partnerId` fixed to `sellerId` — the real route (admin/profit-reports)
// filters by `Product.sellerId` (a User), not the standalone `Partner`
// model (see ADR-008 — these are deliberately distinct concepts). Note
// `period` is accepted by the route but not currently used to filter
// anything (a pre-existing dead parameter on the route itself, not a
// schema bug) — kept here since the route does read it, in case that gets
// wired up later.
export const profitReportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  productId: z.string().cuid().optional(),
  sellerId: z.string().cuid().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
});

// No route currently implements a dedicated per-product margin-update
// operation with this shape (confirmed: grepped every route touching
// `costPerUnit`/`sellerCommissionPercentage` — 13 files — none accept this
// body shape; product margin fields are instead edited as part of the
// general product PUT). Field names corrected to match the real Product
// model (`costPrice`→`costPerUnit`, `partnerCommissionRate`→
// `sellerCommissionPercentage`) so this is at least accurate if a
// dedicated endpoint is ever built.
export const updateProfitMarginSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  costPerUnit: z.number().positive('Cost per unit must be positive'),
  sellerCommissionPercentage: z.number().min(0).max(100, 'Commission rate must be between 0 and 100').optional(),
});

// ==================== DELETION REQUEST SCHEMAS ====================

// Matches the canonical, authenticated /api/data-deletion-requests (P1-6
// consolidated 3 duplicate endpoints down to this one). Identity comes
// from the verified session token, never the request body — this schema
// previously had an `email` field matching the shape of the *unauthenticated*
// duplicate endpoint that was deleted for being a live IDOR/impersonation
// vulnerability (see 15_Implementation_Backlog.md P1-6). `reason` is
// required with the same 10-character minimum the real route enforces.
export const createDeletionRequestSchema = z.object({
  phone: z.string().optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason too long'),
});

// `rejectionReason` has no minimum-length requirement here — the real
// route (admin/data-deletion-requests/[id]/route.ts) accepts any `notes`
// value when rejecting, including none at all (it falls back to "No
// reason provided"). A previous version of this schema enforced a min-10
// rule that was never actually implemented anywhere (confirmed while
// rewriting this route's tests in P2-7) — not carried forward here either.
export const approveDeletionRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
});

// ==================== RFQ SCHEMAS ====================

// Fixed to match the real request shape (rfq/route.ts POST) — an RFQ is a
// top-level subject/message with a multi-product `items` array (each with
// its own quantity/notes), not one flat productId/quantity. `deliveryDate`
// was removed — the real field is `expiresAt`, and it's server-computed
// (now + 30 days), never client-supplied.
export const createRFQSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(20, 'Message must be at least 20 characters').max(2000).optional(),
  targetPrice: z.number().positive().optional(),
  items: z.array(z.object({
    productId: z.string().cuid('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
    notes: z.string().optional(),
  })).min(1, 'RFQ must contain at least one item'),
});

// Fixed to match the real route (rfq/[id]/respond/route.ts) — the RFQ id
// comes from the URL path, not a body field; the message field is named
// `response`, not `message`; `deliveryTime`/`validUntil` don't exist
// anywhere. Note `quotedPrice` is accepted by the route but — per the
// route's own code — is not actually persisted anywhere (no quote/response
// table exists yet to store it in); kept here since the route does read it
// from the body, even though it's currently a no-op.
export const respondToRFQSchema = z.object({
  response: z.string().min(10).max(2000),
  quotedPrice: z.number().positive('Quoted price must be positive').optional(),
  status: z.enum(['QUOTED', 'REJECTED']).optional(),
});

// ==================== ADDRESS SCHEMAS ====================

// Fixed to match the real Address model/route (user/addresses/route.ts) —
// `fullName`/`phone` don't exist on Address at all (those live on User);
// `addressLine1`/`addressLine2` should be one `street` field. Added the
// `type: AddressType` field both the model and route use/default.
export const createAddressSchema = z.object({
  type: z.nativeEnum(AddressType).default(AddressType.SHIPPING),
  street: z.string().min(5, 'Address is required'),
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
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

// ==================== DISCOUNT SCHEMAS ====================
//
// createDiscountSchema removed here (2026-07-18): confirmed there is no
// `Discount`/`Coupon` model anywhere in prisma/schema.prisma and no route
// anywhere under src/app/api implementing discount codes — this schema
// was entirely aspirational, describing a feature that was never built,
// which is actively misleading (a validation schema implies the thing it
// validates exists). A discount-code system may be a legitimate future
// product feature (see 15_Implementation_Backlog.md's P3 section for
// business-prioritized feature work), but that's a product decision, not
// something to scaffold speculatively in a validation-schema file.

// ==================== PERMISSION SCHEMAS ====================

// Fixed to match the real UserPermission model/route
// (admin/permissions/route.ts) — the schema previously invented a
// resource+actions[]+scope shape that doesn't exist anywhere; the real
// model uses a `module: PermissionModule` enum plus six discrete boolean
// flags (canView/canCreate/canEdit/canDelete/canApprove/canExport), and
// the route also accepts an optional `expiresAt`.
export const grantPermissionSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  module: z.nativeEnum(PermissionModule),
  canView: z.boolean().default(false),
  canCreate: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  canApprove: z.boolean().default(false),
  canExport: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});

// ==================== PAGINATION SCHEMAS ====================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== QUERY SCHEMAS ====================

// `q` matches search/products/route.ts's query param name (the
// purpose-built search endpoint this schema most directly corresponds
// to) — note products/route.ts's own search param is instead named
// `search`, so this schema isn't a drop-in fit for that second route.
// Removed `inStock` — no route anywhere reads a query param by that name
// (stock filtering elsewhere is done via `availability`/`includeInactive`,
// not a boolean `inStock` flag); kept `featured`, which products/route.ts
// does read.
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
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
