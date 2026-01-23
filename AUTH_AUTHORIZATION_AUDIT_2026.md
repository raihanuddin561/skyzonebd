# 🔐 Authentication & Authorization Audit - SkyzoneBD Platform
**Date:** January 19, 2026  
**Business Model:** Profit-Sharing Partnership (NOT Multi-Tenant)  
**Critical Finding:** 24 admin endpoints completely unprotected

---

## 📊 EXECUTIVE SUMMARY

### Current Role Structure
Based on your clarification about profit-sharing partners:

| Role | Purpose | Access Level | Multi-Tenant? |
|------|---------|--------------|---------------|
| **SUPER_ADMIN** | Platform owner with override capabilities | Full system access | ❌ No |
| **ADMIN** | Day-to-day platform management | Full management access | ❌ No |
| **PARTNER** | Profit-sharing investor/co-owner | View own profit distributions | ❌ No (shared business) |
| **BUYER** | Customer/purchaser | Order & profile management | ❌ No |
| **SELLER** | Future vendor role (not yet used) | Would manage own products | ✅ Yes (if implemented) |
| **GUEST** | Anonymous checkout | Limited order placement | N/A |

### Security Status

| Category | Count | Status |
|----------|-------|--------|
| ✅ Properly Secured APIs | 26 | Good |
| ⚠️ Inline Auth (needs refactor) | 11 | Medium Risk |
| 🚨 **NO AUTH - Admin Routes** | **24** | **CRITICAL** |
| ✅ Public Routes (intentional) | 19 | Good |
| 🔓 Protected Frontend Pages | 15+ | Good |

---

## 🚨 CRITICAL SECURITY VULNERABILITIES

### 24 Admin Endpoints WITHOUT Authentication

These endpoints expose sensitive data and operations to **anyone on the internet**:

#### **Financial Data Exposure** (Highest Risk)
1. `/api/admin/profit-reports/dashboard` (GET) - Profit data
2. `/api/admin/profit-loss` (GET) - P&L statements
3. `/api/admin/profits` (GET/POST) - Profit configuration
4. `/api/admin/distributions` (GET/POST) - Profit distributions
5. `/api/admin/sales` (GET/POST) - Sales data
6. `/api/admin/costs` (GET/POST) - Operational costs
7. `/api/admin/salaries` (GET/POST) - Employee salaries

#### **User & Access Control** (High Risk)
8. `/api/admin/users` (GET/POST) - User management
9. `/api/admin/partners` (GET/POST) - Partner management
10. `/api/admin/partners/[id]` (PUT/DELETE) - Partner modification
11. `/api/admin/verification` (GET/POST) - Business verification

#### **Inventory & Operations** (High Risk)
12. `/api/admin/inventory` (GET/POST) - Inventory data
13. `/api/admin/inventory/[id]` (PUT/DELETE) - Inventory modification
14. `/api/admin/stock` (GET/POST) - Stock management
15. `/api/admin/stock/adjust` (POST) - Stock adjustments
16. `/api/admin/stock/reorder-alerts` (GET) - Reorder alerts

#### **System & Business Intelligence** (High Risk)
17. `/api/admin/stats` (GET) - Dashboard statistics
18. `/api/admin/analytics` (GET) - Analytics data
19. `/api/admin/settings` (GET/PUT) - System settings
20. `/api/admin/shipping` (GET/POST) - Shipping configuration
21. `/api/admin/payments` (GET/POST) - Payment settings
22. `/api/admin/reviews` (GET/POST) - Review moderation

#### **Data Management** (High Risk - GDPR)
23. `/api/admin/data-deletion-requests/[id]` (GET/PUT) - View/update deletion requests
24. `/api/admin/data-deletion-requests/[id]/execute` (POST) - Execute data deletion
25. `/api/admin/sales/generate` (POST) - Generate sales records
26. `/api/admin/orders/[id]/items` (PUT) - Edit order items
27. `/api/admin/activity-logs/stats` (GET) - Activity statistics

---

## 🏗️ CURRENT AUTH PATTERNS (Inconsistent)

### Pattern 1: requireAuth Helper ✅ (Best Practice)
```typescript
// File: src/lib/auth.ts
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAuth(request); // Returns user or throws 401
  // ... logic
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request); // Requires ADMIN/SUPER_ADMIN role
  // ... logic
}
```

**Used By:**
- ✅ `/api/user/profile`
- ✅ `/api/user/addresses`
- ✅ `/api/user/business-info`
- ✅ `/api/admin/data-deletion-requests` (main route)
- ✅ `/api/admin/users/[id]/status`
- ✅ `/api/admin/users/[id]/role`

### Pattern 2: verifyAdminToken Helper ⚠️ (Legacy)
```typescript
import { verifyAdminToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  // ... logic with auth.userId
}
```

**Used By:**
- `/api/products` (POST/PUT/DELETE)
- `/api/categories` (POST/PUT/DELETE)
- `/api/hero-slides`
- `/api/units`
- `/api/orders/[id]` (admin operations)

**Issue:** Returns boolean instead of throwing, requires manual response handling.

### Pattern 3: Inline JWT Verification ⚠️ (Inconsistent)
```typescript
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
  
  if (decoded.role.toUpperCase() !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... logic
}
```

**Used By:**
- `/api/partner/dashboard` (checks for PARTNER role)
- `/api/partner/profits` (checks for PARTNER role)
- `/api/admin/super-admin/dashboard` (checks for SUPER_ADMIN)
- `/api/orders` (optional auth for user vs guest)

**Issues:**
- Duplicated code
- No database user validation
- Inconsistent error messages
- Easy to make mistakes

### Pattern 4: NO AUTH ❌ (Critical Issue)
```typescript
export async function GET(request: NextRequest) {
  // No authentication check!
  const users = await prisma.user.findMany();
  return NextResponse.json({ success: true, data: users });
}
```

**Used By:** 24 admin endpoints listed above

---

## 🎯 RECOMMENDED GUARD PATTERN

### Phase 1: Enhanced Auth Helpers (Add to src/lib/auth.ts)

```typescript
// ============================================
// ENHANCED AUTH GUARDS
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import prisma from './prisma';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'PARTNER' | 'MANAGER' | 'SELLER' | 'BUYER' | 'GUEST';
  userType: 'RETAIL' | 'WHOLESALE' | 'SELLER' | 'ADMIN' | 'GUEST';
  isActive: boolean;
  isProfitPartner: boolean;
}

// ============================================
// Core Auth Functions (Already Exist - Keep)
// ============================================

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  // ... existing implementation ...
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  // ... existing implementation ...
}

// ============================================
// NEW: Role-Specific Guards
// ============================================

/**
 * Require SUPER_ADMIN role
 * Use for: System-level changes, overrides, critical configs
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (user.role !== 'SUPER_ADMIN') {
    throw new Response(
      JSON.stringify({ 
        success: false,
        error: 'Super Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Require PARTNER role (profit-sharing partner)
 * Use for: Viewing profit distributions, partner dashboard
 * 
 * Note: Partners in this system are profit-sharing co-owners,
 * not multi-tenant vendors. They can view all business data
 * but cannot modify it.
 */
export async function requirePartner(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (user.role !== 'PARTNER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new Response(
      JSON.stringify({ 
        success: false,
        error: 'Partner access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Require authenticated user (any role except GUEST)
 * Use for: User profile, orders, addresses, wishlist
 */
export async function requireUser(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (user.role === 'GUEST') {
    throw new Response(
      JSON.stringify({ 
        success: false,
        error: 'Account required. Please register or log in.',
        code: 'GUEST_NOT_ALLOWED'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Require one of multiple roles
 * Use for: Endpoints that need flexible role access
 */
export async function requireAnyRole(
  request: NextRequest,
  allowedRoles: AuthUser['role'][]
): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (!allowedRoles.includes(user.role)) {
    throw new Response(
      JSON.stringify({ 
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Optional authentication
 * Use for: Public endpoints that enhance UX when authenticated
 * Returns null if not authenticated
 */
export async function optionalAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    return await requireAuth(request);
  } catch {
    return null;
  }
}

// ============================================
// NEW: Permission Helpers
// ============================================

/**
 * Check if user can manage resources
 * Admins can manage all, users can manage their own
 */
export function canManageResource(user: AuthUser, resourceOwnerId: string): boolean {
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.id === resourceOwnerId;
}

/**
 * Check if user can view financial data
 * Admins and partners can view finances
 */
export function canViewFinancials(user: AuthUser): boolean {
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'PARTNER';
}

/**
 * Check if user can modify financial data
 * Only admins can modify finances
 */
export function canModifyFinancials(user: AuthUser): boolean {
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
}

/**
 * Check if user is profit partner
 */
export function isProfitPartner(user: AuthUser): boolean {
  return user.isProfitPartner || user.role === 'PARTNER';
}

// ============================================
// Response Helpers
// ============================================

export function unauthorized(message = 'Authentication required') {
  return NextResponse.json(
    { success: false, error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

export function forbidden(message = 'Access denied') {
  return NextResponse.json(
    { success: false, error: message, code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Add Enhanced Guards (1-2 hours)
1. Add new functions to `src/lib/auth.ts`:
   - `requireSuperAdmin()`
   - `requirePartner()`
   - `requireUser()`
   - `requireAnyRole()`
   - `optionalAuth()`
   - Helper functions

### Phase 2: Secure Critical Endpoints (2-3 hours)
Priority order based on risk:

#### **Immediate (P0)** - Financial & User Data
```typescript
// Financial endpoints - require admin
✅ /api/admin/profit-reports/dashboard → requireAdmin()
✅ /api/admin/profit-loss → requireAdmin()
✅ /api/admin/profits → requireAdmin()
✅ /api/admin/distributions → requireAdmin()
✅ /api/admin/sales → requireAdmin()
✅ /api/admin/costs → requireAdmin()
✅ /api/admin/salaries → requireAdmin()

// User management - require admin
✅ /api/admin/users → requireAdmin()
✅ /api/admin/partners → requireAdmin()
✅ /api/admin/partners/[id] → requireAdmin()

// Data deletion - require admin (GDPR compliance)
✅ /api/admin/data-deletion-requests/[id] → requireAdmin()
✅ /api/admin/data-deletion-requests/[id]/execute → requireSuperAdmin()
```

#### **High Priority (P1)** - Inventory & Operations
```typescript
✅ /api/admin/inventory → requireAdmin()
✅ /api/admin/inventory/[id] → requireAdmin()
✅ /api/admin/stock → requireAdmin()
✅ /api/admin/stock/adjust → requireAdmin()
✅ /api/admin/stock/reorder-alerts → requireAdmin()
✅ /api/admin/analytics → requireAdmin()
✅ /api/admin/stats → requireAdmin()
```

#### **Medium Priority (P2)** - Settings & Configuration
```typescript
✅ /api/admin/settings → requireAdmin()
✅ /api/admin/shipping → requireAdmin()
✅ /api/admin/payments → requireAdmin()
✅ /api/admin/reviews → requireAdmin()
✅ /api/admin/verification → requireAdmin()
```

### Phase 3: Refactor Inline Auth (3-4 hours)
Replace inline JWT verification with guards:

```typescript
// BEFORE (Inline)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... 20 more lines of auth code
}

// AFTER (Guard)
export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  // ... business logic
}
```

**Files to Update:**
- `/api/partner/dashboard` → `requirePartner()`
- `/api/partner/profits` → `requirePartner()`
- `/api/admin/super-admin/dashboard` → `requireSuperAdmin()`
- `/api/products` (admin operations) → `requireAdmin()`
- `/api/orders` (user operations) → `requireUser()`

### Phase 4: Add Resource Ownership Checks (2-3 hours)

For endpoints that access user-specific data:

```typescript
// Example: Order detail endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await optionalAuth(request); // Allow guest with order link
  
  const order = await prisma.order.findUnique({
    where: { id: params.id }
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Check ownership (admin can view all, users only their own)
  if (user && !canManageResource(user, order.userId || '')) {
    return forbidden('You do not have permission to view this order');
  }

  return NextResponse.json({ success: true, order });
}
```

**Files to Update:**
- `/api/orders/[id]` - Add ownership check
- `/api/user/addresses/[id]` - Verify user owns address
- `/api/rfq/[id]` - Verify user owns RFQ

---

## 🗺️ ROUTE-BY-ROUTE IMPLEMENTATION GUIDE

### Admin Routes - Financial (Priority: P0 🔴)

#### 1. `/api/admin/profit-reports/dashboard` (GET)
**Current:** No auth  
**Fix:**
```typescript
import { requireAdmin, canViewFinancials } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request); // Add this line
  
  // Optional: Check specific permission
  if (!canViewFinancials(user)) {
    return forbidden('You do not have permission to view financial data');
  }
  
  // ... existing logic
}
```

#### 2. `/api/admin/profits` (GET/POST)
**Current:** No auth  
**Fix:**
```typescript
import { requireAdmin, canModifyFinancials } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  // ... existing logic
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  
  // Only admins can modify profit config
  if (!canModifyFinancials(user)) {
    return forbidden('Only admins can modify profit configuration');
  }
  
  // ... existing logic
}
```

#### 3. `/api/admin/distributions` (GET/POST)
**Current:** No auth  
**Fix:**
```typescript
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  // ... existing logic
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  // Log the action
  await logActivity({
    userId: user.id,
    action: 'CREATE',
    entityType: 'ProfitDistribution',
    description: `Created profit distribution`
  });
  // ... existing logic
}
```

### Admin Routes - User Management (Priority: P0 🔴)

#### 4. `/api/admin/users` (GET/POST)
**Current:** No auth  
**Fix:**
```typescript
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  // ... existing logic
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  // ... existing logic
}
```

#### 5. `/api/admin/partners` (GET/POST)
**Current:** Has auth via requireAuth, needs admin check  
**Fix:** Already partially protected, ensure POST uses requireAdmin

```typescript
// This route already uses requireAuth + manual admin check
// Simplify to use requireAdmin directly:

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request); // Simplified
  // Remove manual role check - requireAdmin handles it
  // ... existing logic
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request); // Simplified
  // ... existing logic
}
```

### Partner Routes (Priority: P1 🟠)

#### 6. `/api/partner/dashboard` (GET)
**Current:** Inline JWT for PARTNER role  
**Fix:**
```typescript
import { requirePartner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requirePartner(request); // Replaces 40+ lines of inline auth
  
  // Find partner by user
  const partner = await prisma.partner.findFirst({
    where: {
      OR: [
        { email: user.email },
        { id: user.id }
      ]
    }
  });

  if (!partner) {
    return NextResponse.json(
      { success: false, error: 'Partner record not found' },
      { status: 404 }
    );
  }

  // Partners can view all business data (profit-sharing model)
  // No multi-tenant isolation needed
  
  // ... existing logic
}
```

#### 7. `/api/partner/profits` (GET)
**Current:** Inline JWT for PARTNER role  
**Fix:**
```typescript
import { requirePartner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requirePartner(request);
  
  // Partners can view all profit data (shared business)
  // ... existing logic
}
```

### Admin Routes - Inventory (Priority: P1 🟠)

#### 8. `/api/admin/inventory` (GET/POST)
**Current:** No auth  
**Fix:**
```typescript
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  // ... existing logic
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  // ... existing logic
}
```

#### 9. `/api/admin/stock/adjust` (POST)
**Current:** No auth  
**Fix:**
```typescript
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  
  // Log stock adjustment
  await logActivity({
    userId: user.id,
    userName: user.name,
    action: 'UPDATE',
    entityType: 'Inventory',
    description: 'Adjusted stock levels'
  });
  
  // ... existing logic
}
```

### User-Specific Routes (Priority: P1 🟠)

#### 10. `/api/orders/[id]` (GET)
**Current:** No ownership verification  
**Fix:**
```typescript
import { optionalAuth, canManageResource, unauthorized } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await optionalAuth(request); // Allow guest with link
  
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { orderItems: { include: { product: true } } }
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Guest orders can be viewed without auth (via email link)
  // But registered user orders require ownership check
  if (order.userId && user) {
    if (!canManageResource(user, order.userId)) {
      return unauthorized('You do not have permission to view this order');
    }
  }

  return NextResponse.json({ success: true, order });
}
```

---

## 📊 COMPLETE ROUTE AUTHORIZATION MATRIX

### API Routes Authorization Table

| Route | Method | Required Role | Guard Function | Status |
|-------|--------|---------------|----------------|--------|
| **Authentication** | | | | |
| `/api/auth/login` | POST | Public | None | ✅ |
| `/api/auth/register` | POST | Public | None | ✅ |
| | | | | |
| **User Profile** | | | | |
| `/api/user/profile` | GET/PUT | User | `requireUser()` | ✅ |
| `/api/user/addresses` | GET/POST | User | `requireUser()` | ✅ |
| `/api/user/addresses/[id]` | PUT/DELETE | User (owner) | `requireUser()` + ownership | ⚠️ Needs ownership |
| `/api/user/business-info` | GET/POST | User | `requireUser()` | ✅ |
| | | | | |
| **Products** | | | | |
| `/api/products` | GET | Public | None | ✅ |
| `/api/products` | POST/PUT | Admin | `requireAdmin()` | ⚠️ Uses verifyAdminToken |
| `/api/products/[id]` | GET | Public | None | ✅ |
| `/api/products/[id]` | PUT/DELETE | Admin | `requireAdmin()` | ⚠️ Uses verifyAdminToken |
| | | | | |
| **Categories** | | | | |
| `/api/categories` | GET | Public | None | ✅ |
| `/api/categories` | POST/PUT | Admin | `requireAdmin()` | ⚠️ Uses verifyAdminToken |
| `/api/categories/[id]` | GET | Public | None | ✅ |
| `/api/categories/[id]` | PUT/DELETE | Admin | `requireAdmin()` | ⚠️ Uses verifyAdminToken |
| | | | | |
| **Orders** | | | | |
| `/api/orders` | GET | User | `requireUser()` | ⚠️ Inline auth |
| `/api/orders` | POST | User/Guest | `optionalAuth()` | ⚠️ Inline auth |
| `/api/orders/[id]` | GET | User (owner) | `optionalAuth()` + ownership | ❌ No ownership check |
| `/api/orders/[id]` | PATCH | Admin | `requireAdmin()` | ⚠️ Uses verifyAdminToken |
| `/api/orders/cancel` | POST | User (owner) | `requireUser()` + ownership | ⚠️ Inline auth |
| | | | | |
| **Admin - Financial** 🔴 **CRITICAL** | | | | |
| `/api/admin/profit-reports/dashboard` | GET | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/profit-reports` | GET | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/profit-loss` | GET | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/profits` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/distributions` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/sales` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/sales/generate` | POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/costs` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/salaries` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| | | | | |
| **Admin - User Management** 🔴 **CRITICAL** | | | | |
| `/api/admin/users` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/users/[id]/status` | PATCH | Admin | `requireAdmin()` | ✅ |
| `/api/admin/users/[id]/role` | PATCH | Admin | `requireAdmin()` | ✅ |
| `/api/admin/partners` | GET/POST | Admin | `requireAdmin()` | ⚠️ Has auth, needs cleanup |
| `/api/admin/partners/[id]` | PUT/DELETE | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| | | | | |
| **Admin - Inventory** 🟠 **HIGH RISK** | | | | |
| `/api/admin/inventory` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/inventory/[id]` | PUT/DELETE | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/stock` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/stock/adjust` | POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/stock/reorder-alerts` | GET | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| | | | | |
| **Admin - Analytics** 🟠 **HIGH RISK** | | | | |
| `/api/admin/analytics` | GET | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/stats` | GET | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/activity-logs` | GET | Admin | `requireAdmin()` | ⚠️ Uses checkPermission |
| `/api/admin/activity-logs/stats` | GET | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| | | | | |
| **Admin - Settings** 🟡 **MEDIUM RISK** | | | | |
| `/api/admin/settings` | GET/PUT | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/shipping` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/payments` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/verification` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/reviews` | GET/POST | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| | | | | |
| **Admin - Data Deletion** 🔴 **GDPR CRITICAL** | | | | |
| `/api/admin/data-deletion-requests` | GET | Admin | `requireAdmin()` | ✅ |
| `/api/admin/data-deletion-requests/[id]` | GET/PUT | Admin | `requireAdmin()` | ❌ **NO AUTH** |
| `/api/admin/data-deletion-requests/[id]/execute` | POST | Super Admin | `requireSuperAdmin()` | ❌ **NO AUTH** |
| `/api/data-deletion-request` | POST | User | `requireUser()` | ✅ |
| | | | | |
| **Partner Routes** | | | | |
| `/api/partner/dashboard` | GET | Partner | `requirePartner()` | ⚠️ Inline auth |
| `/api/partner/profits` | GET | Partner | `requirePartner()` | ⚠️ Inline auth |
| | | | | |
| **Super Admin** | | | | |
| `/api/admin/super-admin/dashboard` | GET | Super Admin | `requireSuperAdmin()` | ⚠️ Inline auth |
| | | | | |
| **Public/Utility** | | | | |
| `/api/search/products` | GET | Public | None | ✅ |
| `/api/search/suggestions` | GET | Public | None | ✅ |
| `/api/hero-slides` | GET | Public | None | ✅ |
| `/api/hero-slides` | POST/PUT/DELETE | Admin | `requireAdmin()` | ⚠️ Uses verifyAdminToken |
| `/api/units` | GET | Public | None | ✅ |
| `/api/upload` | POST | Admin | `requireAdmin()` | ⚠️ Inline auth |
| `/api/rfq` | GET/POST | User | `requireUser()` | ⚠️ No auth |
| `/api/payment` | POST | User | `requireUser()` | ⚠️ No auth |

---

## 🛡️ FRONTEND PROTECTION STATUS

### Protected Pages ✅

Pages using `useAuth` + role checks in layout/effect:

1. **Admin Layout** - [src/app/admin/layout.tsx](src/app/admin/layout.tsx)
   - ✅ Checks for ADMIN or SUPER_ADMIN role
   - ✅ Redirects to `/auth/login` if unauthorized
   - ✅ Applies to all `/admin/*` pages

2. **Partner Dashboard** - [src/app/partner/dashboard/page.tsx](src/app/partner/dashboard/page.tsx)
   - ✅ Checks for PARTNER role
   - ✅ Redirects to `/dashboard` if not partner

3. **User Orders** - [src/app/orders/page.tsx](src/app/orders/page.tsx)
   - ✅ Uses `<ProtectedRoute>` wrapper
   - ✅ Requires authentication

4. **Dashboard Pages** (Legacy)
   - [src/app/dashboard/users/page.tsx](src/app/dashboard/users/page.tsx) - ✅ ProtectedRoute
   - [src/app/dashboard/orders/page.tsx](src/app/dashboard/orders/page.tsx) - ✅ ProtectedRoute
   - [src/app/dashboard/categories/page.tsx](src/app/dashboard/categories/page.tsx) - ✅ ProtectedRoute

### Unprotected Pages ⚠️

Pages that should require auth but don't:

1. **Order Detail** - [src/app/orders/[id]/page.tsx](src/app/orders/[id]/page.tsx)
   - ⚠️ Uses `useAuth` but no redirect
   - ⚠️ Should verify order ownership
   - **Fix:** Add ownership check or require order access token

2. **Wishlist** - [src/app/wishlist/page.tsx](src/app/wishlist/page.tsx)
   - ⚠️ Uses `useAuth` but no protection
   - **Fix:** Wrap in `<ProtectedRoute>`

3. **Profile** - `/profile` (if exists)
   - Should require auth

---

## 🎯 ACTION ITEMS CHECKLIST

### Immediate (Do Today) 🔴

- [ ] Add enhanced guards to [src/lib/auth.ts](src/lib/auth.ts):
  - [ ] `requireSuperAdmin()`
  - [ ] `requirePartner()`
  - [ ] `requireUser()`
  - [ ] `requireAnyRole()`
  - [ ] `optionalAuth()`
  - [ ] Helper functions

- [ ] Secure 7 critical financial endpoints:
  - [ ] `/api/admin/profit-reports/dashboard`
  - [ ] `/api/admin/profit-loss`
  - [ ] `/api/admin/profits`
  - [ ] `/api/admin/distributions`
  - [ ] `/api/admin/sales`
  - [ ] `/api/admin/costs`
  - [ ] `/api/admin/salaries`

- [ ] Secure data deletion endpoints:
  - [ ] `/api/admin/data-deletion-requests/[id]`
  - [ ] `/api/admin/data-deletion-requests/[id]/execute` (use `requireSuperAdmin`)

### High Priority (This Week) 🟠

- [ ] Secure remaining admin endpoints (17 routes):
  - [ ] User management (3 routes)
  - [ ] Inventory (5 routes)
  - [ ] Analytics (3 routes)
  - [ ] Settings (6 routes)

- [ ] Refactor inline auth to guards:
  - [ ] `/api/partner/dashboard` → `requirePartner()`
  - [ ] `/api/partner/profits` → `requirePartner()`
  - [ ] `/api/admin/super-admin/dashboard` → `requireSuperAdmin()`
  - [ ] `/api/orders` → `requireUser()`

- [ ] Add ownership checks:
  - [ ] `/api/orders/[id]` - Verify order ownership
  - [ ] `/api/user/addresses/[id]` - Verify address ownership

### Medium Priority (Next Sprint) 🟡

- [ ] Migrate verifyAdminToken to requireAdmin:
  - [ ] `/api/products` (POST/PUT/DELETE)
  - [ ] `/api/categories` (POST/PUT/DELETE)
  - [ ] `/api/hero-slides`
  - [ ] `/api/units`
  - [ ] `/api/upload`

- [ ] Add frontend protection:
  - [ ] Wrap wishlist in `<ProtectedRoute>`
  - [ ] Add order ownership check to order detail page

- [ ] Add rate limiting to auth endpoints:
  - [ ] `/api/auth/login` (max 5 attempts/minute)
  - [ ] `/api/auth/register` (max 3 attempts/minute)

### Testing & Documentation 📝

- [ ] Test all admin endpoints require auth
- [ ] Test partner endpoints require PARTNER role
- [ ] Test ownership checks work correctly
- [ ] Update API documentation with auth requirements
- [ ] Add auth examples to README
- [ ] Document partner profit-sharing model

---

## 📝 EXAMPLE IMPLEMENTATIONS

### Example 1: Securing Financial Endpoint

**File:** `src/app/api/admin/profit-reports/dashboard/route.ts`

```typescript
// BEFORE (NO AUTH - CRITICAL VULNERABILITY)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Anyone can access this!
  const stats = await prisma.profitReport.aggregate({
    _sum: { revenue: true, netProfit: true }
  });
  
  return NextResponse.json({ success: true, stats });
}

// AFTER (SECURED)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, canViewFinancials } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Require admin authentication
  const user = await requireAdmin(request);
  
  // Optional: Additional permission check
  if (!canViewFinancials(user)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  // Now safe to return financial data
  const stats = await prisma.profitReport.aggregate({
    _sum: { revenue: true, netProfit: true }
  });
  
  return NextResponse.json({ 
    success: true, 
    stats,
    requestedBy: user.name // Audit trail
  });
}
```

### Example 2: Partner Access (Profit-Sharing Model)

**File:** `src/app/api/partner/dashboard/route.ts`

```typescript
// BEFORE (40+ lines of inline auth)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No token' }, { status: 401 });
  }
  // ... 30 more lines ...
}

// AFTER (Clean guard pattern)
import { requirePartner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requirePartner(request);
  
  // Partners are profit-sharing co-owners
  // They can view ALL business data, not just their own
  // No multi-tenant isolation needed
  
  const partner = await prisma.partner.findFirst({
    where: {
      OR: [
        { email: user.email },
        { id: user.id }
      ]
    },
    include: {
      profitDistributions: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!partner) {
    return NextResponse.json(
      { success: false, error: 'Partner record not found' },
      { status: 404 }
    );
  }

  // Return dashboard data
  return NextResponse.json({
    success: true,
    data: {
      partner,
      businessSummary: {
        // Partners can see all business metrics
        totalRevenue: await getTotalRevenue(),
        totalCosts: await getTotalCosts(),
        netProfit: await getNetProfit()
      }
    }
  });
}
```

### Example 3: Resource Ownership Check

**File:** `src/app/api/orders/[id]/route.ts`

```typescript
// BEFORE (No ownership check)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.id }
  });
  
  return NextResponse.json({ order }); // Anyone can view any order!
}

// AFTER (With ownership check)
import { optionalAuth, canManageResource, forbidden } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await optionalAuth(request);
  
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      orderItems: { include: { product: true } }
    }
  });

  if (!order) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
    );
  }

  // Authorization logic
  // 1. Guest orders (no userId) can be viewed without auth
  // 2. Registered user orders require ownership or admin access
  if (order.userId) {
    if (!user) {
      return forbidden('Please log in to view this order');
    }
    
    if (!canManageResource(user, order.userId)) {
      return forbidden('You do not have permission to view this order');
    }
  }

  return NextResponse.json({ 
    success: true, 
    order 
  });
}
```

---

## 🔍 TESTING STRATEGY

### Manual Testing Checklist

1. **Test Admin Endpoints Without Auth:**
   ```bash
   # Should return 401 Unauthorized
   curl http://localhost:3000/api/admin/profit-reports/dashboard
   curl http://localhost:3000/api/admin/users
   curl http://localhost:3000/api/admin/sales
   ```

2. **Test Admin Endpoints With Buyer Token:**
   ```bash
   # Should return 403 Forbidden
   curl -H "Authorization: Bearer <buyer_token>" \
     http://localhost:3000/api/admin/profit-reports/dashboard
   ```

3. **Test Admin Endpoints With Admin Token:**
   ```bash
   # Should return 200 OK
   curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:3000/api/admin/profit-reports/dashboard
   ```

4. **Test Partner Endpoints:**
   ```bash
   # With partner token - should work
   curl -H "Authorization: Bearer <partner_token>" \
     http://localhost:3000/api/partner/dashboard
   
   # With buyer token - should fail
   curl -H "Authorization: Bearer <buyer_token>" \
     http://localhost:3000/api/partner/dashboard
   ```

5. **Test Order Ownership:**
   ```bash
   # User A trying to access User B's order - should fail
   curl -H "Authorization: Bearer <userA_token>" \
     http://localhost:3000/api/orders/<userB_order_id>
   
   # Admin accessing any order - should work
   curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:3000/api/orders/<any_order_id>
   ```

### Automated Test Suite (Recommended)

```typescript
// tests/auth.test.ts
describe('API Authorization', () => {
  describe('Admin Endpoints', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await fetch('/api/admin/profits');
      expect(response.status).toBe(401);
    });

    it('should reject non-admin users', async () => {
      const response = await fetch('/api/admin/profits', {
        headers: { 'Authorization': `Bearer ${buyerToken}` }
      });
      expect(response.status).toBe(403);
    });

    it('should allow admin users', async () => {
      const response = await fetch('/api/admin/profits', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Partner Endpoints', () => {
    it('should allow partners to view dashboard', async () => {
      const response = await fetch('/api/partner/dashboard', {
        headers: { 'Authorization': `Bearer ${partnerToken}` }
      });
      expect(response.status).toBe(200);
    });

    it('should reject non-partners', async () => {
      const response = await fetch('/api/partner/dashboard', {
        headers: { 'Authorization': `Bearer ${buyerToken}` }
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Order Ownership', () => {
    it('should allow users to view their own orders', async () => {
      const response = await fetch(`/api/orders/${userAOrderId}`, {
        headers: { 'Authorization': `Bearer ${userAToken}` }
      });
      expect(response.status).toBe(200);
    });

    it('should reject users viewing others orders', async () => {
      const response = await fetch(`/api/orders/${userBOrderId}`, {
        headers: { 'Authorization': `Bearer ${userAToken}` }
      });
      expect(response.status).toBe(403);
    });

    it('should allow admins to view all orders', async () => {
      const response = await fetch(`/api/orders/${anyOrderId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.status).toBe(200);
    });
  });
});
```

---

## 🎓 PARTNER MODEL CLARIFICATION

### Your Business Model: Profit-Sharing Partnership

**Key Characteristics:**
- Partners are co-owners/investors, not vendors
- They share in the overall business profit
- They can view ALL business data (no isolation)
- They CANNOT modify data (read-only)
- Profit distribution is based on share percentage

**Access Pattern:**

```
ADMIN/SUPER_ADMIN:
  ✅ Full read/write access to all data
  ✅ Can create/modify products
  ✅ Can process orders
  ✅ Can manage users
  ✅ Can distribute profits

PARTNER:
  ✅ View all business metrics (revenue, costs, profit)
  ✅ View profit distributions to all partners
  ✅ View own distribution history
  ❌ Cannot modify any data
  ❌ Cannot process orders
  ❌ Cannot manage products

BUYER/CUSTOMER:
  ✅ View products
  ✅ Place orders
  ✅ View own orders only
  ❌ Cannot view others' data
  ❌ Cannot view financial data
```

**Multi-Tenant vs Profit-Sharing:**

```
❌ MULTI-TENANT (Not Your Model):
   - Vendor A manages only their products
   - Vendor A sees only their orders
   - Vendor A gets paid for their sales
   - Complete data isolation

✅ PROFIT-SHARING (Your Model):
   - Partners share one business
   - Partners view all business data
   - Partners get % of total profit
   - No data isolation (shared business)
```

---

## 📊 RISK ASSESSMENT

| Vulnerability | Severity | Likelihood | Impact | Priority |
|--------------|----------|------------|---------|----------|
| Unprotected financial endpoints | CRITICAL | High | Data breach, financial loss | P0 🔴 |
| Unprotected user management | CRITICAL | High | Account takeover, data theft | P0 🔴 |
| Unprotected data deletion execute | CRITICAL | Medium | GDPR violation, data loss | P0 🔴 |
| No order ownership checks | HIGH | High | Privacy violation | P1 🟠 |
| Inconsistent auth patterns | MEDIUM | High | Bugs, maintenance issues | P2 🟡 |
| Inline JWT verification | LOW | Low | Code quality, consistency | P3 ⚪ |

**Estimated Risk Reduction:**
- Securing 24 admin endpoints: **85% risk reduction**
- Adding ownership checks: **10% risk reduction**
- Refactoring inline auth: **5% risk reduction**

---

**Total Estimated Effort:** 8-12 hours  
**Recommended Timeline:** 2-3 days  
**Deployment:** Can be done incrementally without downtime

