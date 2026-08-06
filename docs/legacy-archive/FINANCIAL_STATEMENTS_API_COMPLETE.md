# Financial Statements API Module - Implementation Complete

**Implementation Date:** January 2026  
**Module Status:** ✅ FULLY IMPLEMENTED  
**Total Endpoints:** 10 (5 Partner + 5 Admin)

---

## 📋 Overview

This document details the complete implementation of the Financial Statements backend module for SkyzoneBD. The module provides comprehensive financial reporting capabilities for both partners and administrators, with support for pagination, date filtering, and optimized database queries.

---

## 🎯 Implementation Summary

### Database Optimizations
**File:** `prisma/schema.prisma`

Added performance indexes to support financial queries:

**Order Model Indexes:**
- `@@index([status, createdAt])` - Filter delivered orders by date
- `@@index([status, updatedAt])` - Track order status changes
- `@@index([userId, status])` - User-specific order filtering
- `@@index([createdAt])` - Chronological sorting

**OrderItem Model Indexes:**
- `@@index([productId, createdAt])` - Product performance over time
- `@@index([orderId, productId])` - Order-product relationships

### Core Utilities

#### 1. Financial Calculator (`src/lib/financialCalculator.ts`)
**Purpose:** Centralized financial calculation functions  
**Key Functions:**
- `calculateProfit()` - Revenue, costs, expenses, profit calculations
- `calculateDateRange()` - Supports periods: today, yesterday, last7days, last30days, thisMonth, lastMonth, thisYear, custom
- `validateDateRange()` - Ensures date ranges don't exceed 1 year
- `formatCurrency()` - BDT currency formatting
- `calculatePercentageChange()` - Period-over-period comparisons
- `calculateGrowthRate()` - Trend analysis
- `calculateProfitMargin()` - Margin calculations
- `calculateAOV()` - Average order value

#### 2. Pagination Helper (`src/lib/paginationHelper.ts`)
**Purpose:** Consistent pagination across all endpoints  
**Features:**
- Offset-based pagination (traditional)
- Cursor-based pagination (infinite scroll)
- Default: 20 items per page
- Maximum: 100 items per page
- Metadata includes: total, page, limit, totalPages, hasNextPage, hasPreviousPage

---

## 🔐 Partner Endpoints

### 1. Profit & Loss Statement
**Endpoint:** `GET /api/partner/financial/profit-loss`  
**Auth:** requirePartner()  
**File:** `src/app/api/partner/financial/profit-loss/route.ts`

**Query Parameters:**
- `startDate` (ISO 8601) - Period start date
- `endDate` (ISO 8601) - Period end date
- `period` - Preset period (thisMonth, lastMonth, last30days, etc.)
- `format` - Response format: `summary` or `detailed`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 225000,
      "totalCOGS": 140000,
      "grossProfit": 85000,
      "grossProfitMargin": 37.78,
      "totalOperationalCosts": 10000,
      "operatingProfit": 75000,
      "operatingProfitMargin": 33.33,
      "netProfit": 50000,
      "netProfitMargin": 22.22,
      "partnerShare": 12500,
      "partnerSharePercentage": 25
    },
    "revenue": {
      "subtotal": 220000,
      "shipping": 5000,
      "discounts": 0,
      "total": 225000
    },
    "distributions": {
      "approved": 8000,
      "pending": 2500,
      "paid": 6000,
      "outstanding": 2000
    }
  }
}
```

**Features:**
- Calculates partner's share based on profitSharePercentage
- Tracks distribution status (pending, approved, paid)
- Includes revenue breakdown (subtotal, shipping, discounts)
- Cost analysis (COGS, operational costs)
- Profit margins (gross, operating, net)

---

### 2. Sales Summary
**Endpoint:** `GET /api/partner/financial/sales-summary`  
**Auth:** requirePartner()  
**File:** `src/app/api/partner/financial/sales-summary/route.ts`

**Query Parameters:**
- `period` - Date range preset
- `startDate` / `endDate` - Custom date range
- `groupBy` - Grouping: `day`, `week`, or `month`
- `page` / `limit` - Pagination

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "periods": [
      {
        "date": "2026-01-15",
        "formattedDate": "Jan 15, 2026",
        "orderCount": 45,
        "revenue": 67500,
        "profit": 15000,
        "profitMargin": 22.22,
        "partnerShare": 3750,
        "units": 320,
        "averageOrderValue": 1500,
        "growth": 12.5
      }
    ],
    "summary": {
      "totalRevenue": 225000,
      "totalProfit": 50000,
      "totalOrders": 150,
      "averageOrderValue": 1500,
      "partnerShare": 12500
    },
    "comparison": {
      "revenueChange": 15.8,
      "profitChange": 22.3,
      "ordersChange": 8.7
    }
  },
  "pagination": {
    "total": 30,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

**Features:**
- Time-series analysis (daily/weekly/monthly)
- Period-over-period comparisons
- Revenue trends and growth metrics
- Average order value tracking
- Partner share calculations

---

### 3. Distribution History
**Endpoint:** `GET /api/partner/financial/distributions`  
**Auth:** requirePartner()  
**File:** `src/app/api/partner/financial/distributions/route.ts`

**Query Parameters:**
- `status` - Filter: `PENDING`, `APPROVED`, or `PAID`
- `page` / `limit` - Pagination

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "distributions": [
      {
        "id": "dist_123",
        "periodType": "MONTHLY",
        "startDate": "2026-01-01",
        "endDate": "2026-01-31",
        "totalRevenue": 225000,
        "netProfit": 50000,
        "distributionAmount": 12500,
        "status": "APPROVED",
        "approvedBy": { "name": "Admin User" },
        "approvedAt": "2026-02-02",
        "orderCount": 150,
        "daysInPeriod": 31
      }
    ],
    "summary": {
      "totalEarned": 50000,
      "totalPaid": 30000,
      "totalApproved": 12500,
      "totalPending": 7500,
      "outstanding": 12500
    }
  }
}
```

**Features:**
- Complete payout history
- Status filtering (pending, approved, paid)
- Days outstanding calculation
- Payment method tracking
- Lifetime earnings summary

---

### 4. Top Products
**Endpoint:** `GET /api/partner/financial/top-products`  
**Auth:** requirePartner()  
**File:** `src/app/api/partner/financial/top-products/route.ts`

**Query Parameters:**
- `startDate` / `endDate` - Date range
- `sortBy` - Sort by: `profit`, `revenue`, or `units`
- `limit` - Number of products (default 10, max 50)

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productId": "prod_123",
        "productName": "Premium Widget",
        "sku": "WIDGET-001",
        "unitsSold": 450,
        "revenue": 67500,
        "profit": 15000,
        "profitMargin": 22.22,
        "orderCount": 89
      }
    ],
    "summary": {
      "totalProducts": 10,
      "totalRevenue": 150000,
      "totalProfit": 35000
    }
  }
}
```

**Features:**
- Uses Prisma groupBy for efficient aggregation
- Sort by profit, revenue, or units sold
- Product-level performance metrics
- Profit margin analysis

---

### 5. Dashboard Overview
**Endpoint:** `GET /api/partner/financial/dashboard`  
**Auth:** requirePartner()  
**File:** `src/app/api/partner/financial/dashboard/route.ts`

**Query Parameters:**
- `period` - Date range (default: thisMonth)

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "revenue": {
        "current": 225000,
        "previous": 195000,
        "change": 15.38
      },
      "profit": {
        "current": 50000,
        "previous": 42000,
        "change": 19.05
      },
      "partnerShare": {
        "current": 12500,
        "percentage": 25,
        "change": 19.05
      },
      "orders": {
        "current": 150,
        "previous": 138,
        "change": 8.7
      }
    },
    "distributions": {
      "totalPaid": 30000,
      "outstandingPayouts": 12500,
      "recent": [...]
    },
    "topProducts": [...]
  }
}
```

**Features:**
- Consolidated key metrics
- Period-over-period comparisons
- Recent distribution history
- Top 5 products preview
- Growth indicators

---

## 👨‍💼 Admin Endpoints

### 1. Platform-Wide P&L
**Endpoint:** `GET /api/admin/financial/profit-loss`  
**Auth:** requireAdmin()  
**File:** `src/app/api/admin/financial/profit-loss/route.ts`

**Query Parameters:**
- `period` - Date range preset
- `startDate` / `endDate` - Custom range
- `format` - `summary` or `detailed`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 1500000,
      "totalCOGS": 900000,
      "grossProfit": 600000,
      "grossProfitMargin": 40,
      "totalOperationalCosts": 150000,
      "operatingProfit": 450000,
      "totalDistributions": 112500,
      "netProfit": 337500,
      "platformRetainedProfit": 337500
    },
    "costs": {
      "byCategory": {
        "MARKETING": 50000,
        "OPERATIONS": 30000,
        "SALARIES": 40000,
        "RENT": 15000
      }
    },
    "distributions": {
      "approved": 112500,
      "paid": 80000,
      "pending": 25000,
      "outstanding": 32500
    }
  }
}
```

**Features:**
- Complete platform financial overview
- Cost breakdown by category
- Partner distribution tracking
- Platform retained profit calculation
- Detailed breakdown mode with top orders

---

### 2. Partner Comparison
**Endpoint:** `GET /api/admin/financial/partner-comparison`  
**Auth:** requireAdmin()  
**File:** `src/app/api/admin/financial/partner-comparison/route.ts`

**Query Parameters:**
- `period` - Date range
- `sortBy` - Sort by: `revenue`, `profit`, `distributions`, or `orders`
- `sortOrder` - `asc` or `desc`
- `page` / `limit` - Pagination

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "partners": [
      {
        "partnerId": "partner_1",
        "partnerName": "Partner A",
        "profitSharePercentage": 25,
        "revenue": {
          "current": 225000,
          "growth": 15.38
        },
        "profit": {
          "current": 50000,
          "growth": 19.05
        },
        "partnerShare": {
          "entitled": 12500,
          "distributed": 10000,
          "outstanding": 2500
        },
        "contribution": {
          "revenuePercentage": 15,
          "profitPercentage": 18
        }
      }
    ],
    "summary": {
      "totalRevenue": 1500000,
      "platformRetained": 337500,
      "averageRevenuePerPartner": 300000
    }
  }
}
```

**Features:**
- Compare all partners side-by-side
- Revenue and profit contribution percentages
- Growth metrics per partner
- Distribution status tracking
- Sortable by multiple criteria

---

### 3. Outstanding Payouts
**Endpoint:** `GET /api/admin/financial/outstanding-payouts`  
**Auth:** requireAdmin()  
**File:** `src/app/api/admin/financial/outstanding-payouts/route.ts`

**Query Parameters:**
- `status` - Filter: `APPROVED` or `PENDING`
- `partnerId` - Filter by specific partner
- `overdue` - Boolean, show only overdue (>30 days)
- `sortBy` - Sort by: `approvedAt`, `amount`, or `daysOutstanding`
- `page` / `limit` - Pagination

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "distributions": [
      {
        "id": "dist_456",
        "partnerId": "partner_1",
        "partnerName": "Partner A",
        "distributionAmount": 12500,
        "status": "APPROVED",
        "approvedAt": "2026-01-15",
        "daysOutstanding": 45,
        "isOverdue": true,
        "urgency": "high"
      }
    ],
    "summary": {
      "totalOutstanding": 125000,
      "approvedCount": 8,
      "pendingCount": 5,
      "overdueCount": 3,
      "highUrgencyCount": 2
    },
    "byPartner": [
      {
        "partnerId": "partner_1",
        "partnerName": "Partner A",
        "totalOutstanding": 25000,
        "count": 2,
        "oldestOutstanding": 60
      }
    ]
  }
}
```

**Features:**
- Overdue detection (>30 days = overdue)
- Urgency levels: high (>60 days), medium (30-60), low (<30)
- Partner-wise grouping
- Payment priority sorting
- Filtering by status and partner

---

### 4. Revenue Analytics
**Endpoint:** `GET /api/admin/financial/revenue-analytics`  
**Auth:** requireAdmin()  
**File:** `src/app/api/admin/financial/revenue-analytics/route.ts`

**Query Parameters:**
- `period` - Date range
- `groupBy` - `day`, `week`, or `month`
- `forecast` - Boolean, include forecasting (default: false)

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "timeSeries": [
      {
        "date": "2026-01-15",
        "orderCount": 45,
        "revenue": 67500,
        "profit": 15000,
        "profitMargin": 22.22,
        "growth": 12.5
      }
    ],
    "summary": {
      "totalRevenue": 1500000,
      "totalProfit": 337500,
      "averageOrderValue": 1500,
      "profitMargin": 22.5
    },
    "breakdown": {
      "byPaymentMethod": [
        {
          "method": "BKASH",
          "revenue": 900000,
          "percentage": 60
        }
      ]
    },
    "trends": {
      "isGrowing": true,
      "averageGrowthRate": 15.5,
      "peakRevenue": 75000,
      "mostProductiveDay": {...}
    },
    "forecast": {
      "growthRate": 15.5,
      "periods": [
        {
          "date": "2026-02-01",
          "forecastedRevenue": 70000,
          "confidence": "medium"
        }
      ]
    }
  }
}
```

**Features:**
- Time-series revenue analysis
- Growth rate calculations
- Revenue forecasting (optional)
- Payment method breakdown
- Trend identification
- Peak performance tracking

---

### 5. Cost Breakdown
**Endpoint:** `GET /api/admin/financial/cost-breakdown`  
**Auth:** requireAdmin()  
**File:** `src/app/api/admin/financial/cost-breakdown/route.ts`

**Query Parameters:**
- `period` - Date range
- `groupBy` - Time grouping: `day`, `week`, or `month`
- `category` - Filter by specific cost category
- `page` / `limit` - Pagination (for detailed costs)

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCosts": 1050000,
      "totalCOGS": 900000,
      "totalOperationalCosts": 150000,
      "cogsPercentage": 85.71,
      "operationalPercentage": 14.29,
      "cogsToRevenueRatio": 60,
      "operationalToRevenueRatio": 10
    },
    "timeSeries": [
      {
        "date": "2026-01-15",
        "cogs": 45000,
        "operational": 7500,
        "total": 52500,
        "growth": 8.3
      }
    ],
    "cogs": {
      "total": 900000,
      "byCategory": [
        {
          "category": "Electronics",
          "amount": 450000,
          "percentage": 50
        }
      ]
    },
    "operational": {
      "total": 150000,
      "byCategory": [
        {
          "category": "MARKETING",
          "amount": 50000,
          "percentage": 33.33,
          "count": 25
        }
      ],
      "bySubcategory": [...],
      "detailedCosts": [...]
    },
    "insights": {
      "highestCostCategory": "MARKETING",
      "averageDailyCost": 5000,
      "costTrend": "increasing"
    }
  }
}
```

**Features:**
- COGS vs Operational cost breakdown
- Cost-to-revenue ratios
- Category and subcategory analysis
- Time-series cost tracking
- Cost optimization insights
- Detailed transaction listing

---

## 🔍 Key Implementation Details

### Authentication & Authorization
- **Partner Endpoints:** Use `requirePartner()` middleware
- **Admin Endpoints:** Use `requireAdmin()` middleware
- Partners see only platform-wide data (profit-sharing co-owners)
- Admins see all data across partners

### Date Range Handling
- All endpoints support flexible date ranges
- Preset periods: today, yesterday, last7days, last30days, thisMonth, lastMonth, thisYear
- Custom ranges via `startDate` and `endDate` parameters
- Maximum range: 1 year (validated)
- Uses `date-fns` for date calculations

### Database Query Optimization
- Leverages indexes added to Order and OrderItem models
- Uses Prisma `groupBy` for efficient aggregations
- Minimizes N+1 queries with `include` and `select`
- Filters at database level, not application level

### Pagination Strategy
- Consistent pagination across all list endpoints
- Default: 20 items per page
- Maximum: 100 items per page
- Returns metadata: total, page, limit, totalPages, hasNextPage
- Supports both offset-based and cursor-based pagination

### Response Formatting
- All monetary values include both raw and formatted versions
- Currency formatting: BDT (Bangladeshi Taka)
- Percentages rounded to 2 decimal places
- Dates in ISO 8601 format
- Includes `meta` object with generation timestamp

### Error Handling
- Consistent error response structure
- HTTP status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
- Detailed error messages in development
- Sanitized errors in production

---

## 📊 Data Flow

### Partner P&L Calculation
```
1. Fetch delivered orders in date range
2. Calculate total revenue (sum of order.total)
3. Calculate COGS (sum of orderItem.costPrice * quantity)
4. Fetch operational costs from OperationalCost table
5. Calculate gross profit = revenue - COGS
6. Calculate operating profit = gross profit - operational costs
7. Calculate partner share = operating profit × profitSharePercentage
8. Fetch distributions from ProfitDistribution table
9. Return comprehensive P&L with all breakdowns
```

### Admin Revenue Analytics
```
1. Fetch all delivered orders in date range
2. Group by time period (day/week/month)
3. Aggregate: order count, revenue, profit per period
4. Calculate growth rates between periods
5. Analyze payment method distribution
6. If forecast requested:
   - Calculate historical growth rate
   - Project next 3 periods using exponential growth
7. Return time series + summary + trends + forecast
```

### Outstanding Payouts Tracking
```
1. Fetch distributions with status APPROVED or PENDING
2. Calculate days outstanding since approvedAt
3. Determine urgency: high (>60 days), medium (30-60), low (<30)
4. Mark as overdue if >30 days
5. Group by partner for summary
6. Sort by urgency/amount/date based on query
7. Return prioritized payout list
```

---

## 🧪 Testing Recommendations

### Unit Tests
- Test financial calculation functions in isolation
- Verify date range validation logic
- Test pagination helper with edge cases
- Validate currency formatting

### Integration Tests
- Test each endpoint with various query parameters
- Verify authentication middleware enforcement
- Test with empty datasets (no orders/distributions)
- Test date range edge cases (single day, max 1 year)

### Performance Tests
- Load test with 10,000+ orders
- Verify index effectiveness with EXPLAIN queries
- Test pagination with large datasets
- Monitor query execution times

### Edge Cases
- No orders in date range
- Partner with 0% profit share
- Orders without cost price set
- Missing operational costs
- Distributions with null dates

---

## 🚀 Usage Examples

### Fetch Partner Monthly P&L
```bash
GET /api/partner/financial/profit-loss?period=thisMonth&format=detailed
```

### Get Partner Top Products by Profit
```bash
GET /api/partner/financial/top-products?sortBy=profit&limit=20&period=last30days
```

### Admin: Compare All Partners This Quarter
```bash
GET /api/admin/financial/partner-comparison?period=thisQuarter&sortBy=revenue&sortOrder=desc
```

### Admin: Check Overdue Payouts
```bash
GET /api/admin/financial/outstanding-payouts?overdue=true&sortBy=daysOutstanding
```

### Admin: Revenue Forecast for Next Month
```bash
GET /api/admin/financial/revenue-analytics?period=last90days&groupBy=week&forecast=true
```

### Admin: Analyze Operational Costs
```bash
GET /api/admin/financial/cost-breakdown?period=thisMonth&groupBy=day&category=MARKETING
```

---

## 📈 Future Enhancements

### Potential Additions
1. **Export to Excel/PDF:** Add export functionality for reports
2. **Email Reports:** Schedule automated email reports
3. **Real-time Dashboards:** WebSocket updates for live metrics
4. **Budget vs Actual:** Compare actual costs to budgeted amounts
5. **Tax Calculations:** Integrate VAT/tax calculations
6. **Multi-currency:** Support multiple currencies
7. **Comparative Analysis:** Compare against industry benchmarks
8. **Custom Reports:** User-defined report builder

### Performance Optimizations
1. **Caching:** Redis cache for frequently accessed reports
2. **Materialized Views:** Pre-aggregate common queries
3. **Background Jobs:** Generate complex reports asynchronously
4. **Database Partitioning:** Partition orders by date for faster queries

---

## 🎓 Key Learnings

### Architecture Decisions
1. **Centralized Calculations:** All financial logic in `financialCalculator.ts` ensures consistency
2. **Index Strategy:** Strategic indexes on frequently filtered columns (status, createdAt)
3. **Pagination Pattern:** Reusable pagination helper prevents code duplication
4. **Partner Model:** Partners are profit-sharing co-owners, not isolated tenants

### Best Practices Applied
1. **TypeScript:** Full type safety across all endpoints
2. **Error Handling:** Consistent try-catch with detailed error messages
3. **Code Reusability:** DRY principle with utility functions
4. **Performance:** Database-level filtering and aggregation
5. **Documentation:** Inline comments and comprehensive docs

---

## ✅ Implementation Checklist

- [x] Database schema optimization (indexes)
- [x] Financial calculator utility
- [x] Pagination helper utility
- [x] Partner P&L endpoint
- [x] Partner sales summary endpoint
- [x] Partner distributions endpoint
- [x] Partner top products endpoint
- [x] Partner dashboard endpoint
- [x] Admin platform P&L endpoint
- [x] Admin partner comparison endpoint
- [x] Admin outstanding payouts endpoint
- [x] Admin revenue analytics endpoint
- [x] Admin cost breakdown endpoint
- [x] Comprehensive documentation

---

## 📞 Support & Maintenance

### Common Issues
1. **Date Range Validation Errors:** Ensure date ranges don't exceed 1 year
2. **Pagination Errors:** Verify `limit` doesn't exceed 100
3. **Missing Cost Prices:** Some older orders may not have costPrice set
4. **Zero Profit Share:** Partner with 0% share will show $0 partner share

### Debugging Tips
1. Check database indexes with `EXPLAIN` queries
2. Monitor Prisma query logs in development
3. Verify authentication tokens are valid
4. Check date formats are ISO 8601 compliant

---

## 📝 API Version
**Version:** 1.0  
**Last Updated:** January 2026  
**Stability:** Production Ready

---

**End of Implementation Documentation**
