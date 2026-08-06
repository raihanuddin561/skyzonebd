# 💼 Financial Statements Module - Implementation Plan
**Date:** January 20, 2026  
**Scope:** Complete backend API for partner & admin financial reporting

---

## 📋 OVERVIEW

### Module Purpose
Provide comprehensive financial reporting and analytics for:
- **Partners:** View their profit distributions, sales performance, and payouts
- **Admins:** Platform-wide financial overview, partner comparisons, payout management

### Key Features
- Real-time financial calculations
- Date range filtering
- Multi-dimension filtering (status, partner, product)
- Pagination for large datasets
- Optimized database queries with proper indexes
- Export-ready data formats

---

## 🏗️ ARCHITECTURE

### API Structure

```
/api/partner/financial/
  ├── /profit-loss          GET  - Partner P&L statement
  ├── /sales-summary        GET  - Sales breakdown
  ├── /distributions        GET  - Payout history
  ├── /top-products         GET  - Top profitable/selling products
  └── /dashboard            GET  - Financial overview

/api/admin/financial/
  ├── /profit-loss          GET  - Platform-wide P&L
  ├── /partner-comparison   GET  - Compare partner performance
  ├── /outstanding-payouts  GET  - Unpaid distributions
  ├── /revenue-analytics    GET  - Revenue trends
  └── /cost-breakdown       GET  - Expense analysis
```

### Data Flow

```
Request → Auth Guard → Query Builder → Prisma Query → 
Aggregation → Calculation → Cache (optional) → Response
```

---

## 📊 DATABASE OPTIMIZATION

### Required Indexes

```prisma
// Orders - Critical for financial queries
@@index([status, createdAt])
@@index([status, deliveredAt])
@@index([userId, status])

// OrderItems - For product performance
@@index([productId, createdAt])
@@index([orderId, productId])

// Sales - For revenue analysis
@@index([saleDate, paymentStatus])
@@index([customerId, saleDate])
@@index([productId, saleDate])

// ProfitDistribution - For partner payouts
@@index([partnerId, status])
@@index([startDate, endDate])
@@index([status, paidAt])

// OperationalCost - For expense tracking
@@index([category, date])
@@index([month, year])
```

### Query Optimization Strategy

1. **Use aggregations** instead of fetching all records
2. **Limit date ranges** to prevent full table scans
3. **Index on filtered columns** (status, date, partnerId)
4. **Use cursor-based pagination** for large datasets
5. **Cache expensive calculations** (daily aggregates)

---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Database Schema Updates (30 min)
- Add missing indexes
- Verify profit tracking fields
- Create views for common queries (optional)

### Phase 2: Financial Calculation Utilities (1 hour)
- P&L calculation logic
- Net profit calculation (revenue - costs - expenses)
- Profit margin calculations
- Date range utilities

### Phase 3: Partner Financial Endpoints (2-3 hours)
- P&L statement
- Sales summary
- Distribution history
- Top products analysis
- Dashboard overview

### Phase 4: Admin Financial Endpoints (2-3 hours)
- Platform-wide P&L
- Partner comparison
- Outstanding payouts
- Revenue analytics
- Cost breakdown

### Phase 5: Testing & Optimization (1 hour)
- Performance testing with large datasets
- Query optimization
- Edge case handling

**Total Estimated Time:** 6-8 hours

---

## 📑 DETAILED SPECIFICATIONS

### 1. Partner P&L Statement

**Endpoint:** `GET /api/partner/financial/profit-loss`

**Query Parameters:**
```typescript
{
  startDate: string;  // ISO date
  endDate: string;    // ISO date
  format?: 'summary' | 'detailed'; // Default: summary
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    period: {
      startDate: "2026-01-01",
      endDate: "2026-01-31"
    },
    revenue: {
      totalOrders: 45,
      totalRevenue: 225000,
      deliveredRevenue: 200000,
      pendingRevenue: 25000
    },
    costs: {
      totalCOGS: 140000,
      averageCostPerOrder: 3111
    },
    expenses: {
      shippingCosts: 5000,
      platformFees: 3000,
      otherExpenses: 2000,
      total: 10000
    },
    profit: {
      grossProfit: 60000,      // Revenue - COGS
      netProfit: 50000,        // Gross - Expenses
      profitMargin: 25.0,      // %
      partnerShare: 12500,     // 25% of net profit
      partnerSharePercent: 25
    },
    distributions: {
      approved: 10000,
      pending: 2500,
      paid: 10000
    }
  }
}
```

**Database Query:**
```typescript
// Aggregate orders in date range
const orders = await prisma.order.aggregate({
  where: {
    userId: partnerId,
    status: 'DELIVERED',
    deliveredAt: {
      gte: startDate,
      lte: endDate
    }
  },
  _sum: {
    total: true,
    totalCost: true,
    grossProfit: true,
    netProfit: true
  },
  _count: true
});

// Get distributions
const distributions = await prisma.profitDistribution.aggregate({
  where: {
    partnerId,
    startDate: { gte: startDate },
    endDate: { lte: endDate }
  },
  _sum: { distributionAmount: true }
});
```

---

### 2. Partner Sales Summary

**Endpoint:** `GET /api/partner/financial/sales-summary`

**Query Parameters:**
```typescript
{
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month'; // Default: day
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    summary: {
      totalSales: 225000,
      totalOrders: 45,
      averageOrderValue: 5000,
      totalUnits: 2250
    },
    breakdown: [
      {
        date: "2026-01-15",
        orders: 5,
        revenue: 25000,
        units: 250,
        profit: 5000
      },
      // ... more entries
    ],
    pagination: {
      page: 1,
      limit: 30,
      total: 31,
      pages: 2
    }
  }
}
```

---

### 3. Partner Top Products

**Endpoint:** `GET /api/partner/financial/top-products`

**Query Parameters:**
```typescript
{
  startDate: string;
  endDate: string;
  sortBy: 'profit' | 'revenue' | 'units'; // Default: profit
  limit?: number; // Default: 10
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    topProfitable: [
      {
        productId: "prod_123",
        productName: "Widget A",
        unitsSold: 500,
        revenue: 50000,
        cost: 35000,
        profit: 15000,
        profitMargin: 30.0
      },
      // ... top 10
    ],
    topSelling: [
      {
        productId: "prod_456",
        productName: "Widget B",
        unitsSold: 1000,
        revenue: 80000,
        profit: 12000
      },
      // ... top 10
    ]
  }
}
```

**Optimized Query:**
```typescript
const topProducts = await prisma.orderItem.groupBy({
  by: ['productId'],
  where: {
    order: {
      status: 'DELIVERED',
      deliveredAt: {
        gte: startDate,
        lte: endDate
      }
    }
  },
  _sum: {
    quantity: true,
    total: true,
    totalProfit: true
  },
  orderBy: {
    _sum: {
      totalProfit: 'desc'
    }
  },
  take: limit
});
```

---

### 4. Partner Distribution History

**Endpoint:** `GET /api/partner/financial/distributions`

**Query Parameters:**
```typescript
{
  status?: 'PENDING' | 'APPROVED' | 'PAID';
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    distributions: [
      {
        id: "dist_123",
        periodType: "MONTHLY",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        totalRevenue: 225000,
        netProfit: 50000,
        partnerShare: 25,
        distributionAmount: 12500,
        status: "APPROVED",
        approvedAt: "2026-02-05",
        paidAt: null,
        orderCount: 45
      },
      // ... more
    ],
    summary: {
      totalEarned: 50000,
      totalPaid: 37500,
      outstanding: 12500,
      pendingApproval: 5000
    },
    pagination: { ... }
  }
}
```

---

### 5. Admin Platform-Wide P&L

**Endpoint:** `GET /api/admin/financial/profit-loss`

**Query Parameters:**
```typescript
{
  startDate: string;
  endDate: string;
  includeDetails?: boolean; // Default: false
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    period: { startDate, endDate },
    revenue: {
      totalOrders: 500,
      grossRevenue: 2500000,
      returns: 50000,
      netRevenue: 2450000
    },
    costs: {
      productCosts: 1600000,   // COGS
      shippingCosts: 80000,
      paymentGatewayFees: 49000,
      totalCosts: 1729000
    },
    operatingExpenses: {
      salaries: 100000,
      rent: 20000,
      utilities: 10000,
      marketing: 50000,
      other: 20000,
      total: 200000
    },
    profit: {
      grossProfit: 850000,     // Revenue - COGS
      operatingProfit: 521000, // Gross - Operating Expenses
      netProfit: 521000,
      profitMargin: 21.3       // %
    },
    profitDistribution: {
      platformShare: 390750,   // 75%
      partnerShares: 130250,   // 25%
      paidToPartners: 100000,
      outstanding: 30250
    }
  }
}
```

**Complex Query:**
```typescript
// Revenue from delivered orders
const revenue = await prisma.order.aggregate({
  where: {
    status: 'DELIVERED',
    deliveredAt: { gte: startDate, lte: endDate }
  },
  _sum: {
    total: true,
    totalCost: true,
    netProfit: true,
    platformProfit: true
  }
});

// Operating expenses
const expenses = await prisma.operationalCost.aggregate({
  where: {
    date: { gte: startDate, lte: endDate },
    paymentStatus: 'PAID'
  },
  _sum: { amount: true },
  _groupBy: { category: true }
});

// Partner distributions
const distributions = await prisma.profitDistribution.aggregate({
  where: {
    startDate: { gte: startDate },
    endDate: { lte: endDate }
  },
  _sum: { distributionAmount: true },
  _groupBy: { status: true }
});
```

---

### 6. Admin Partner Comparison

**Endpoint:** `GET /api/admin/financial/partner-comparison`

**Query Parameters:**
```typescript
{
  startDate: string;
  endDate: string;
  sortBy?: 'profit' | 'revenue' | 'orders';
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    partners: [
      {
        partnerId: "partner_123",
        partnerName: "John Doe",
        profitSharePercent: 25,
        metrics: {
          orders: 45,
          revenue: 225000,
          profit: 50000,
          distributed: 12500,
          outstanding: 2500
        },
        status: "ACTIVE",
        lastDistribution: "2026-01-31"
      },
      // ... more partners
    ],
    totals: {
      totalPartners: 4,
      totalRevenue: 900000,
      totalProfit: 200000,
      totalDistributed: 50000,
      totalOutstanding: 10000
    },
    pagination: { ... }
  }
}
```

---

### 7. Admin Outstanding Payouts

**Endpoint:** `GET /api/admin/financial/outstanding-payouts`

**Query Parameters:**
```typescript
{
  partnerId?: string;
  status?: 'PENDING' | 'APPROVED';
  orderBy?: 'amount' | 'date';
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    payouts: [
      {
        distributionId: "dist_123",
        partner: {
          id: "partner_123",
          name: "John Doe",
          profitSharePercent: 25
        },
        period: {
          type: "MONTHLY",
          startDate: "2026-01-01",
          endDate: "2026-01-31"
        },
        amount: 12500,
        status: "APPROVED",
        approvedAt: "2026-02-05",
        dueDate: "2026-02-15",
        daysOverdue: 5
      },
      // ... more
    ],
    summary: {
      totalOutstanding: 50000,
      totalOverdue: 15000,
      count: 8
    },
    pagination: { ... }
  }
}
```

---

## 🔧 HELPER UTILITIES

### Financial Calculator (`src/lib/financialCalculator.ts`)

```typescript
export interface ProfitCalculation {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  platformProfit: number;
  partnerProfit: number;
}

export function calculateProfit(
  revenue: number,
  costs: number,
  expenses: number,
  platformCommissionRate: number
): ProfitCalculation {
  const grossProfit = revenue - costs;
  const netProfit = grossProfit - expenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  
  const platformProfit = netProfit * (platformCommissionRate / 100);
  const partnerProfit = netProfit - platformProfit;
  
  return {
    grossProfit,
    netProfit,
    profitMargin,
    platformProfit,
    partnerProfit
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT'
  }).format(amount);
}

export function calculateDateRange(
  type: 'today' | 'week' | 'month' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date
): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (type) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now)
      };
    case 'week':
      return {
        startDate: startOfWeek(now),
        endDate: endOfWeek(now)
      };
    case 'month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now)
      };
    case 'year':
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now)
      };
    case 'custom':
      return {
        startDate: customStart || startOfMonth(now),
        endDate: customEnd || endOfMonth(now)
      };
  }
}
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Partner Endpoints
```typescript
// All partner endpoints require:
import { requirePartner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requirePartner(request);
  
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
      { error: 'Partner record not found' },
      { status: 404 }
    );
  }
  
  // ... financial logic using partner.id
}
```

### Admin Endpoints
```typescript
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  
  // ... financial logic for entire platform
}
```

---

## 📊 PAGINATION PATTERN

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
}

function getPaginationParams(searchParams: URLSearchParams): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '20'),
    100 // Max 100 items per page
  );
  
  const skip = (page - 1) * limit;
  
  return { skip, take: limit, page, limit };
}

function createPaginationResponse(
  total: number,
  page: number,
  limit: number
) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
}
```

---

## 🎨 RESPONSE FORMATTING

### Standard Success Response
```typescript
interface FinancialResponse<T> {
  success: true;
  data: T;
  meta?: {
    generatedAt: string;
    executionTime: number;
    cached?: boolean;
  };
  pagination?: PaginationInfo;
}
```

### Standard Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}
```

---

## 🧪 TESTING CHECKLIST

### Unit Tests
- [ ] Financial calculation functions
- [ ] Date range utilities
- [ ] Pagination helpers
- [ ] Number formatting

### Integration Tests
- [ ] Partner P&L with real data
- [ ] Admin platform P&L accuracy
- [ ] Top products calculation
- [ ] Outstanding payouts listing

### Performance Tests
- [ ] Query response time < 500ms
- [ ] Handle 10,000+ orders
- [ ] Pagination efficiency
- [ ] Index utilization

### Security Tests
- [ ] Partner can only see their data
- [ ] Admin can see all data
- [ ] Invalid token rejection
- [ ] SQL injection prevention

---

## 📦 DELIVERABLES

1. ✅ Schema updates with indexes
2. ✅ Financial calculation utilities
3. ✅ Partner financial endpoints (5 routes)
4. ✅ Admin financial endpoints (5 routes)
5. ✅ Comprehensive error handling
6. ✅ Query optimization
7. ✅ Documentation
8. ✅ Test suite

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Database migration (add indexes)
- [ ] Deploy utility functions
- [ ] Deploy partner endpoints
- [ ] Deploy admin endpoints
- [ ] Update API documentation
- [ ] Monitor query performance
- [ ] Set up error alerting
- [ ] Cache frequently accessed data

---

**READY TO IMPLEMENT** - Let's build this file-by-file! 🎯
