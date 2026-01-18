# Partner Visibility Model - SkyzoneBD

**Date:** January 18, 2026  
**Type:** Single-Company with Partners (Not Multi-Tenant)  
**Scope:** Financial visibility + profit sharing for business partners/investors

---

## 1. BUSINESS CONTEXT

**Model:** SkyzoneBD is a **single company** with multiple **business partners/investors** who:
- Have invested capital in the business
- Receive profit share based on agreements
- Need visibility into financial performance
- Do NOT operate independent businesses (not multi-tenant)
- Cannot edit operational data (orders, products, inventory) unless explicitly granted

**Use Cases:**
1. Investor partner wants to see monthly P&L
2. Partner checks their profit distribution history
3. Co-owner reviews sales performance and expenses
4. Partner validates profit calculation transparency
5. Admin configures partner profit percentages

---

## 2. ENHANCED PRISMA ENTITIES

### 2.1 Leverage Existing Models (Already in Schema)

#### ✅ Partner Model (Lines 1080-1120 in schema.prisma)
```prisma
model Partner {
  id                    String   @id @default(cuid())
  name                  String
  email                 String?  @unique
  phone                 String?
  
  // Profit Share Configuration
  profitSharePercentage Float    // % of net profit (0-100)
  isActive              Boolean  @default(true)
  
  // Partnership Details
  partnerType           String?  // INVESTOR, CO_OWNER, SILENT_PARTNER
  joinDate              DateTime @default(now())
  exitDate              DateTime?
  
  // Financial
  initialInvestment     Float?
  totalProfitReceived   Float @default(0)
  
  // Contact & Legal
  address               String?
  taxId                 String?
  bankAccount           String?
  
  notes                 String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  profitDistributions   ProfitDistribution[]
  contributions         PartnerContribution[]  // NEW
  shares                PartnerShare[]         // NEW
  accessLogs            PartnerAccessLog[]     // NEW
  
  @@map("partners")
  @@index([isActive])
  @@index([partnerType])
}
```

#### ✅ ProfitDistribution Model (Lines 1122-1163 in schema.prisma)
```prisma
model ProfitDistribution {
  id                    String   @id @default(cuid())
  partnerId             String
  
  // Period
  periodType            String   // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  startDate             DateTime
  endDate               DateTime
  
  // Financial Data
  totalRevenue          Float
  totalCosts            Float
  netProfit             Float
  
  partnerSharePercent   Float    // Partner's % at time of distribution
  distributionAmount    Float    // Actual amount to distribute
  
  // Status
  status                String   @default("PENDING") // PENDING, APPROVED, PAID, REJECTED
  approvedBy            String?
  approvedAt            DateTime?
  paidAt                DateTime?
  paymentMethod         String?
  paymentReference      String?
  
  notes                 String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  partner               Partner  @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  
  @@map("profit_distributions")
  @@index([partnerId])
  @@index([periodType])
  @@index([startDate, endDate])
  @@index([status])
}
```

### 2.2 NEW Models to Add

#### 🆕 PartnerContribution
```prisma
// Track all financial contributions from partners
model PartnerContribution {
  id                String              @id @default(cuid())
  partnerId         String
  
  // Contribution Details
  contributionType  ContributionType    // INITIAL_CAPITAL, ADDITIONAL_INVESTMENT, LOAN, EQUIPMENT, OTHER
  amount            Float               // Monetary value
  description       String
  
  // Transaction
  transactionDate   DateTime            @default(now())
  receiptNumber     String?
  bankReference     String?
  
  // Verification
  isVerified        Boolean             @default(false)
  verifiedBy        String?             // Admin user ID
  verifiedAt        DateTime?
  
  // Documents
  attachmentUrl     String?             // Receipt/proof document
  
  notes             String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  // Relations
  partner           Partner             @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  
  @@map("partner_contributions")
  @@index([partnerId])
  @@index([contributionType])
  @@index([transactionDate])
}

enum ContributionType {
  INITIAL_CAPITAL
  ADDITIONAL_INVESTMENT
  LOAN
  EQUIPMENT
  PROPERTY
  OTHER
}
```

#### 🆕 PartnerShare
```prisma
// Manage partner ownership shares over time (for equity-based partners)
model PartnerShare {
  id                  String    @id @default(cuid())
  partnerId           String
  
  // Share Details
  shareType           ShareType @default(EQUITY)
  sharePercentage     Float     // % ownership (0-100)
  sharesCount         Int?      // Number of shares (if applicable)
  
  // Validity
  effectiveDate       DateTime  @default(now())
  expiryDate          DateTime? // null = permanent
  
  // Value
  valuePerShare       Float?
  totalValue          Float?
  
  // Changes tracking
  reason              String?   // "Initial allocation", "Dilution", "Buy-in", "Exit"
  previousShareId     String?   // Reference to previous share record (for history)
  changedBy           String?   // Admin user ID who made the change
  
  isActive            Boolean   @default(true)
  
  notes               String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relations
  partner             Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  
  @@map("partner_shares")
  @@index([partnerId])
  @@index([effectiveDate])
  @@index([isActive])
}

enum ShareType {
  EQUITY              // Ownership stake
  PROFIT_SHARE        // Profit-only share (no ownership)
  PREFERRED           // Preferred shares (priority in distributions)
  COMMON              // Common shares
}
```

#### 🆕 PartnerAccessLog
```prisma
// Audit trail for partner access to financial data
model PartnerAccessLog {
  id              String         @id @default(cuid())
  partnerId       String
  
  // Access Details
  accessType      PartnerAccessType
  resourceType    String         // "profit_reports", "sales_data", "expenses", "dashboard"
  resourceId      String?        // Specific record ID (if applicable)
  
  // Request Info
  ipAddress       String?
  userAgent       String?
  requestPath     String?        // API endpoint accessed
  
  // Response
  wasSuccessful   Boolean        @default(true)
  errorMessage    String?
  
  accessedAt      DateTime       @default(now())
  
  // Relations
  partner         Partner        @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  
  @@map("partner_access_logs")
  @@index([partnerId])
  @@index([accessType])
  @@index([accessedAt])
}

enum PartnerAccessType {
  VIEW_DASHBOARD
  VIEW_PROFIT_REPORT
  VIEW_SALES_DATA
  VIEW_EXPENSES
  VIEW_INVENTORY_VALUE
  DOWNLOAD_REPORT
  VIEW_DISTRIBUTION
}
```

#### 🆕 PartnerPermission
```prisma
// Granular permissions for partners (if some can edit certain things)
model PartnerPermission {
  id              String               @id @default(cuid())
  partnerId       String
  
  // Permissions
  module          PartnerPermissionModule
  canView         Boolean              @default(true)
  canExport       Boolean              @default(false)
  canComment      Boolean              @default(false)   // Can add comments/notes
  canRequestEdit  Boolean              @default(false)   // Can request changes (admin approves)
  
  // Granted by admin
  grantedBy       String?
  grantedAt       DateTime             @default(now())
  expiresAt       DateTime?
  
  notes           String?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  
  // Relations
  partner         Partner              @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  
  @@unique([partnerId, module])
  @@map("partner_permissions")
  @@index([partnerId])
}

enum PartnerPermissionModule {
  PROFIT_REPORTS
  SALES_REPORTS
  EXPENSE_REPORTS
  INVENTORY_REPORTS
  EMPLOYEE_PAYROLL
  PROFIT_DISTRIBUTIONS
  OPERATIONAL_COSTS
  CASH_FLOW
  BALANCE_SHEET
  PARTNER_CONTRIBUTIONS
}
```

---

## 3. SCOPE RULES & ACCESS MATRIX

### 3.1 What Partners CAN View

| Resource | Scope | API Endpoint | Notes |
|----------|-------|--------------|-------|
| **Profit Reports** | All company-wide | `/api/partner/profit-reports` | Net profit, gross profit, margins |
| **Revenue Data** | Aggregated sales | `/api/partner/revenue` | Total revenue, revenue by category |
| **COGS** | Aggregated | `/api/partner/cogs` | Cost of goods sold |
| **Expenses** | By category | `/api/partner/expenses` | Operational costs breakdown |
| **Payroll Summary** | Totals only | `/api/partner/payroll-summary` | Total payroll, NOT individual salaries |
| **Stock Valuation** | Inventory value | `/api/partner/inventory-value` | Total inventory value at cost |
| **Sales Performance** | Product/category level | `/api/partner/sales` | Units sold, revenue by product |
| **Own Distributions** | Own records only | `/api/partner/my-distributions` | Their profit distributions |
| **Own Contributions** | Own records only | `/api/partner/my-contributions` | Their capital contributions |
| **Own Shares** | Own records only | `/api/partner/my-shares` | Their ownership/share info |

### 3.2 What Partners CANNOT View

| Resource | Reason |
|----------|--------|
| Individual employee salaries | Privacy |
| Customer PII (names, addresses) | Data protection |
| Supplier pricing details | Competitive sensitivity |
| Individual order details | Operational data |
| User credentials/emails | Security |
| Product base costs (only COGS totals) | Competitive info |
| Other partners' distribution amounts | Privacy |

### 3.3 What Partners CANNOT Edit

**By Default:** Partners have **READ-ONLY** access to ALL financial data

**Optional Override:** Admin can grant specific `PartnerPermission` for:
- Commenting on reports
- Requesting edits (approval workflow)
- Exporting reports

---

## 4. ENFORCEMENT MECHANISMS

### 4.1 Database-Level Enforcement

#### Row-Level Security via Prisma Middleware
```typescript
// src/lib/prisma.ts
prisma.$use(async (params, next) => {
  const { model, action } = params;
  
  // Partner models - enforce partner can only see their own data
  if (model === 'PartnerDistribution' && action === 'findMany') {
    // Inject partnerId filter if not admin
    const isPartnerQuery = params.args.where?.partnerId;
    if (!isPartnerQuery) {
      throw new Error('Partners can only access their own distributions');
    }
  }
  
  return next(params);
});
```

### 4.2 API-Level Enforcement

#### Partner Authentication Middleware
```typescript
// src/lib/auth.ts (ADD TO EXISTING)

export async function requirePartner(request: NextRequest): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  partnerId?: string;  // Link to Partner record
}> {
  const user = await requireAuth(request);
  
  // Check if user is a partner (role = PARTNER or isProfitPartner = true)
  if (user.role !== 'PARTNER' && user.role !== 'SUPER_ADMIN') {
    throw new Error('Partner access required');
  }
  
  // Get associated partner record
  const partner = await prisma.partner.findFirst({
    where: { 
      email: user.email,
      isActive: true 
    }
  });
  
  if (!partner) {
    throw new Error('Partner record not found');
  }
  
  return { ...user, partnerId: partner.id };
}

export async function checkPartnerPermission(
  partnerId: string,
  module: PartnerPermissionModule
): Promise<boolean> {
  const permission = await prisma.partnerPermission.findUnique({
    where: { partnerId_module: { partnerId, module } }
  });
  
  return permission?.canView ?? false;
}
```

### 4.3 Data Filtering Rules

#### Aggregate-Only Queries
```typescript
// Example: Partner can see total payroll but not individual salaries
export async function getPayrollSummary(partnerId: string, period: string) {
  // Log access
  await logPartnerAccess(partnerId, 'VIEW_PAYROLL', 'payroll_summary');
  
  const summary = await prisma.salary.aggregate({
    where: { month: period.month, year: period.year },
    _sum: {
      grossSalary: true,
      netSalary: true,
      totalDeductions: true
    },
    _count: true  // Number of employees (not names)
  });
  
  return {
    totalGrossSalary: summary._sum.grossSalary,
    totalNetSalary: summary._sum.netSalary,
    totalDeductions: summary._sum.totalDeductions,
    employeeCount: summary._count,
    // NO individual records
  };
}
```

---

## 5. MIGRATION APPROACH

### Phase 1: Schema Migration (Week 1)

#### Step 1: Add New Models
```bash
# Add to prisma/schema.prisma
# - PartnerContribution
# - PartnerShare
# - PartnerAccessLog
# - PartnerPermission
# - New enums: ContributionType, ShareType, PartnerAccessType, PartnerPermissionModule

# Generate migration
npm run db:migrate

# Migration name: "add_partner_visibility_models"
```

#### Step 2: Seed Initial Data
```typescript
// prisma/seeds/partner-migration.ts

async function migrateExistingPartners() {
  // 1. Create PartnerShare records for existing partners
  const partners = await prisma.partner.findMany({
    where: { isActive: true }
  });
  
  for (const partner of partners) {
    await prisma.partnerShare.create({
      data: {
        partnerId: partner.id,
        shareType: 'PROFIT_SHARE',
        sharePercentage: partner.profitSharePercentage,
        effectiveDate: partner.joinDate,
        reason: 'Initial migration from legacy system',
        isActive: true
      }
    });
  }
  
  // 2. Create default permissions for all partners
  const modules: PartnerPermissionModule[] = [
    'PROFIT_REPORTS',
    'SALES_REPORTS',
    'EXPENSE_REPORTS',
    'INVENTORY_REPORTS',
    'PROFIT_DISTRIBUTIONS'
  ];
  
  for (const partner of partners) {
    for (const module of modules) {
      await prisma.partnerPermission.create({
        data: {
          partnerId: partner.id,
          module,
          canView: true,
          canExport: true,
          canComment: false
        }
      });
    }
  }
  
  // 3. Backfill contributions if initialInvestment exists
  for (const partner of partners) {
    if (partner.initialInvestment && partner.initialInvestment > 0) {
      await prisma.partnerContribution.create({
        data: {
          partnerId: partner.id,
          contributionType: 'INITIAL_CAPITAL',
          amount: partner.initialInvestment,
          description: 'Initial investment (migrated from legacy data)',
          transactionDate: partner.joinDate,
          isVerified: true
        }
      });
    }
  }
}
```

### Phase 2: Link Users to Partners (Week 1)

#### Add Link Field to User Model
```prisma
model User {
  // ... existing fields
  
  partnerId       String?  // Link to Partner record
  partner         Partner? @relation(fields: [partnerId], references: [id])
  
  // ... rest of model
}
```

#### Migration Script
```typescript
async function linkUsersToPartners() {
  const users = await prisma.user.findMany({
    where: { 
      OR: [
        { role: 'PARTNER' },
        { isProfitPartner: true }
      ]
    }
  });
  
  for (const user of users) {
    // Find matching partner by email
    const partner = await prisma.partner.findUnique({
      where: { email: user.email }
    });
    
    if (partner) {
      await prisma.user.update({
        where: { id: user.id },
        data: { partnerId: partner.id }
      });
    } else {
      // Create partner record if doesn't exist
      const newPartner = await prisma.partner.create({
        data: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          profitSharePercentage: user.profitSharePercentage || 0,
          partnerType: 'INVESTOR',
          isActive: true,
          initialInvestment: 0
        }
      });
      
      await prisma.user.update({
        where: { id: user.id },
        data: { partnerId: newPartner.id }
      });
    }
  }
}
```

### Phase 3: API Implementation (Week 2)

Create partner-specific API routes (see Section 6 below)

### Phase 4: Testing & Rollout (Week 3)

- Unit tests for all partner APIs
- Access control testing
- Partner UAT (User Acceptance Testing)
- Production deployment

---

## 6. PARTNER DASHBOARD API ENDPOINTS

### 6.1 Dashboard Overview

#### `GET /api/partner/dashboard`
**Auth:** Requires PARTNER role  
**Returns:** High-level metrics

```typescript
// src/app/api/partner/dashboard/route.ts

export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  await logPartnerAccess(partner.partnerId!, 'VIEW_DASHBOARD', 'dashboard');
  
  const [thisMonth, lastMonth] = getDateRanges();
  
  // Aggregate data only
  const metrics = await Promise.all([
    // Total revenue this month
    prisma.order.aggregate({
      where: { 
        createdAt: { gte: thisMonth.start, lte: thisMonth.end },
        status: 'DELIVERED'
      },
      _sum: { total: true }
    }),
    
    // Total profit this month
    prisma.profitReport.aggregate({
      where: { 
        reportDate: { gte: thisMonth.start, lte: thisMonth.end }
      },
      _sum: { netProfit: true, platformProfit: true }
    }),
    
    // Partner's distribution this month
    prisma.profitDistribution.findFirst({
      where: {
        partnerId: partner.partnerId,
        startDate: { gte: thisMonth.start },
        endDate: { lte: thisMonth.end }
      }
    }),
    
    // Stock valuation
    getInventoryValuation(),
    
    // Total expenses this month
    prisma.operationalCost.aggregate({
      where: {
        date: { gte: thisMonth.start, lte: thisMonth.end }
      },
      _sum: { amount: true }
    })
  ]);
  
  return NextResponse.json({
    success: true,
    data: {
      revenue: {
        current: metrics[0]._sum.total || 0,
        // Add previous month for comparison
      },
      profit: {
        net: metrics[1]._sum.netProfit || 0,
        platform: metrics[1]._sum.platformProfit || 0
      },
      partnerDistribution: metrics[2]?.distributionAmount || 0,
      inventoryValue: metrics[3],
      expenses: metrics[4]._sum.amount || 0,
      period: 'current_month'
    }
  });
}
```

### 6.2 Profit Reports

#### `GET /api/partner/profit-reports`
**Query Params:** `startDate`, `endDate`, `period` (daily/monthly/yearly)

```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  await checkPartnerPermission(partner.partnerId!, 'PROFIT_REPORTS');
  await logPartnerAccess(partner.partnerId!, 'VIEW_PROFIT_REPORT', 'profit_reports');
  
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  
  const reports = await prisma.profitLossReport.findMany({
    where: {
      startDate: { gte: new Date(startDate!) },
      endDate: { lte: new Date(endDate!) }
    },
    orderBy: { reportDate: 'desc' }
  });
  
  return NextResponse.json({
    success: true,
    data: reports,
    metadata: {
      totalReports: reports.length,
      totalNetProfit: reports.reduce((sum, r) => sum + r.netProfit, 0),
      averageMargin: reports.reduce((sum, r) => sum + r.netMargin, 0) / reports.length
    }
  });
}
```

### 6.3 Revenue & Sales

#### `GET /api/partner/revenue`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  await checkPartnerPermission(partner.partnerId!, 'SALES_REPORTS');
  
  // Aggregate only - no customer PII
  const revenue = await prisma.order.groupBy({
    by: ['status', 'createdAt'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['DELIVERED', 'SHIPPED'] }
    },
    _sum: {
      total: true,
      subtotal: true
    },
    _count: true
  });
  
  return NextResponse.json({
    success: true,
    data: {
      totalRevenue: revenue.reduce((s, r) => s + (r._sum.total || 0), 0),
      orderCount: revenue.reduce((s, r) => s + r._count, 0),
      // No customer names, emails, or order details
    }
  });
}
```

#### `GET /api/partner/sales`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  await checkPartnerPermission(partner.partnerId!, 'SALES_REPORTS');
  
  // Product-level sales (no customer info)
  const sales = await prisma.sale.groupBy({
    by: ['productId'],
    where: {
      saleDate: { gte: startDate, lte: endDate }
    },
    _sum: {
      quantity: true,
      totalAmount: true,
      profitAmount: true
    },
    _count: true
  });
  
  // Enrich with product names only
  const enriched = await Promise.all(
    sales.map(async (sale) => {
      const product = await prisma.product.findUnique({
        where: { id: sale.productId },
        select: { name: true, sku: true, category: { select: { name: true } } }
      });
      
      return {
        productName: product?.name,
        sku: product?.sku,
        category: product?.category.name,
        unitsSold: sale._sum.quantity,
        revenue: sale._sum.totalAmount,
        profit: sale._sum.profitAmount,
        transactionCount: sale._count
      };
    })
  );
  
  return NextResponse.json({ success: true, data: enriched });
}
```

### 6.4 Expenses

#### `GET /api/partner/expenses`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  await checkPartnerPermission(partner.partnerId!, 'EXPENSE_REPORTS');
  
  const expenses = await prisma.operationalCost.groupBy({
    by: ['category', 'month', 'year'],
    where: {
      date: { gte: startDate, lte: endDate }
    },
    _sum: { amount: true },
    _count: true
  });
  
  return NextResponse.json({
    success: true,
    data: expenses.map(e => ({
      category: e.category,
      period: `${e.year}-${e.month}`,
      totalAmount: e._sum.amount,
      transactionCount: e._count
      // No vendor details, no invoice numbers
    }))
  });
}
```

### 6.5 Payroll Summary

#### `GET /api/partner/payroll-summary`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  await checkPartnerPermission(partner.partnerId!, 'EMPLOYEE_PAYROLL');
  
  const payroll = await prisma.salary.aggregate({
    where: {
      month: parseInt(month),
      year: parseInt(year)
    },
    _sum: {
      grossSalary: true,
      netSalary: true,
      totalDeductions: true
    },
    _count: true
  });
  
  return NextResponse.json({
    success: true,
    data: {
      period: `${year}-${month}`,
      totalGrossSalary: payroll._sum.grossSalary,
      totalNetSalary: payroll._sum.netSalary,
      totalDeductions: payroll._sum.totalDeductions,
      employeeCount: payroll._count,
      // NO individual names, salaries, or personal info
    }
  });
}
```

### 6.6 Inventory Valuation

#### `GET /api/partner/inventory-value`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  await checkPartnerPermission(partner.partnerId!, 'INVENTORY_REPORTS');
  
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      stockQuantity: true,
      basePrice: true,
      wholesalePrice: true,
      category: { select: { name: true } }
    }
  });
  
  const valuation = products.map(p => ({
    productName: p.name,
    sku: p.sku,
    category: p.category.name,
    stockQuantity: p.stockQuantity,
    costValue: p.stockQuantity * p.basePrice,
    retailValue: p.stockQuantity * p.wholesalePrice
  }));
  
  const totals = {
    totalStockQuantity: products.reduce((s, p) => s + p.stockQuantity, 0),
    totalCostValue: valuation.reduce((s, v) => s + v.costValue, 0),
    totalRetailValue: valuation.reduce((s, v) => s + v.retailValue, 0),
    productCount: products.length
  };
  
  return NextResponse.json({
    success: true,
    data: { items: valuation, summary: totals }
  });
}
```

### 6.7 Partner's Own Data

#### `GET /api/partner/my-distributions`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  
  const distributions = await prisma.profitDistribution.findMany({
    where: { partnerId: partner.partnerId },
    orderBy: { startDate: 'desc' }
  });
  
  return NextResponse.json({
    success: true,
    data: distributions,
    summary: {
      totalDistributions: distributions.length,
      totalAmountReceived: distributions
        .filter(d => d.status === 'PAID')
        .reduce((s, d) => s + d.distributionAmount, 0),
      pendingAmount: distributions
        .filter(d => d.status === 'PENDING')
        .reduce((s, d) => s + d.distributionAmount, 0)
    }
  });
}
```

#### `GET /api/partner/my-contributions`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  
  const contributions = await prisma.partnerContribution.findMany({
    where: { partnerId: partner.partnerId },
    orderBy: { transactionDate: 'desc' }
  });
  
  return NextResponse.json({
    success: true,
    data: contributions,
    summary: {
      totalContributions: contributions.reduce((s, c) => s + c.amount, 0),
      verifiedAmount: contributions
        .filter(c => c.isVerified)
        .reduce((s, c) => s + c.amount, 0)
    }
  });
}
```

#### `GET /api/partner/my-shares`
```typescript
export async function GET(request: NextRequest) {
  const partner = await requirePartner(request);
  
  const shares = await prisma.partnerShare.findMany({
    where: { partnerId: partner.partnerId, isActive: true },
    orderBy: { effectiveDate: 'desc' }
  });
  
  const currentShare = shares[0]; // Most recent
  
  return NextResponse.json({
    success: true,
    data: {
      current: currentShare,
      history: shares
    }
  });
}
```

---

## 7. ADMIN ENDPOINTS FOR PARTNER MANAGEMENT

### `POST /api/admin/partners` - Create Partner
### `PATCH /api/admin/partners/[id]` - Update Partner
### `POST /api/admin/partners/[id]/contributions` - Add Contribution
### `POST /api/admin/partners/[id]/distributions` - Create Distribution
### `PATCH /api/admin/partners/[id]/permissions` - Update Permissions
### `GET /api/admin/partners/[id]/access-logs` - View Access Logs

---

## 8. SECURITY CHECKS

### 8.1 Authentication Checks
```typescript
✅ All partner endpoints require JWT authentication
✅ Token must have role = 'PARTNER' or 'SUPER_ADMIN'
✅ Partner record must exist and be active
✅ Token expiration enforced (7 days)
```

### 8.2 Authorization Checks
```typescript
✅ Partners can ONLY access their own distributions/contributions/shares
✅ Aggregate financial data accessible only if permission granted
✅ NO access to individual customer/employee/supplier PII
✅ Admin-only endpoints protected with requireAdmin()
```

### 8.3 Data Sanitization
```typescript
✅ All responses use aggregate queries or filtered projections
✅ No raw Prisma queries exposed to partners
✅ Customer emails/phones/addresses stripped from responses
✅ Employee salaries returned as totals only
✅ Supplier pricing excluded from expense reports
```

### 8.4 Audit Trail
```typescript
✅ Every partner API call logged to PartnerAccessLog
✅ Tracks: endpoint, timestamp, IP, success/failure
✅ Admin can review partner access patterns
✅ Alerts on suspicious access patterns (future)
```

### 8.5 Rate Limiting
```typescript
✅ Implement rate limiting on partner endpoints
   - 100 requests per hour per partner
   - Prevent data scraping
```

### 8.6 Data Export Controls
```typescript
✅ Export permission required (canExport flag)
✅ Watermark/timestamp on exported reports
✅ Export logged to PartnerAccessLog
```

---

## 9. ACCEPTANCE CRITERIA

### Functional Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| F1 | Partner can log in and access dashboard | Login with PARTNER role → see dashboard |
| F2 | Dashboard shows correct profit data | Compare with admin profit reports (match) |
| F3 | Partner cannot see other partners' distributions | Query other partner ID → 403 Forbidden |
| F4 | Partner can view revenue by category | GET /api/partner/revenue → returns categories |
| F5 | Expense reports exclude vendor details | Response contains no vendor names/contacts |
| F6 | Payroll shows totals only | Response has no employee names/individual salaries |
| F7 | Inventory value calculated correctly | Sum(stockQty × basePrice) matches |
| F8 | Partner distributions have correct percentages | Distribution amount = netProfit × sharePercent |
| F9 | Access logs record all partner API calls | Each request creates PartnerAccessLog entry |
| F10 | Partners cannot edit financial data | All write operations return 403 |

### Security Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| S1 | Unauthenticated requests rejected | No token → 401 Unauthorized |
| S2 | Non-partner users cannot access partner endpoints | BUYER role → 403 Forbidden |
| S3 | Inactive partners cannot access | isActive=false → 403 Forbidden |
| S4 | Partners cannot access admin endpoints | Partner tries /api/admin/* → 403 |
| S5 | SQL injection prevented | Prisma parameterized queries used |
| S6 | No PII leaked in responses | Manual audit of response schemas |
| S7 | Rate limiting enforced | 101st request in hour → 429 Too Many Requests |

### Performance Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| P1 | Dashboard loads in <2 seconds | Load test with 10 concurrent partners |
| P2 | Profit reports API <3 seconds | Query 1 year of data |
| P3 | Aggregate queries use indexes | EXPLAIN ANALYZE on queries |
| P4 | No N+1 query problems | Monitor query count per request |

---

## 10. UI MOCKUP (Minimal Requirements)

### Partner Dashboard (Read-Only)

```
┌─────────────────────────────────────────────────────┐
│  SkyzoneBD Partner Portal                    [Logout]│
├─────────────────────────────────────────────────────┤
│  Welcome back, John Investor                        │
│  Your Share: 25% | Status: Active                   │
├──────────────────┬──────────────────┬───────────────┤
│  📊 Revenue      │  💰 Net Profit   │  📦 Inventory │
│  ৳12,500,000     │  ৳3,200,000      │  ৳5,600,000   │
│  +12% vs last mo │  Margin: 25.6%   │  1,234 items  │
├──────────────────┴──────────────────┴───────────────┤
│  Your Distributions (This Month)                    │
│  • Pending: ৳800,000 (25% of ৳3,200,000)            │
│  • Last Paid: ৳750,000 on Dec 30, 2025              │
│                                         [View All]   │
├─────────────────────────────────────────────────────┤
│  📈 Profit Trend (Last 6 Months)                    │
│  [Chart showing monthly profit]                     │
├─────────────────────────────────────────────────────┤
│  Quick Links:                                       │
│  • Profit Reports    • Sales Analysis               │
│  • Expense Breakdown • My Contributions             │
│  • Inventory Value   • Distribution History         │
└─────────────────────────────────────────────────────┘
```

### Required Pages
1. `/partner/dashboard` - Overview
2. `/partner/profit-reports` - Detailed P&L
3. `/partner/revenue` - Revenue analysis
4. `/partner/sales` - Sales by product/category
5. `/partner/expenses` - Expense breakdown
6. `/partner/inventory` - Stock valuation
7. `/partner/my-distributions` - Distribution history
8. `/partner/my-contributions` - Capital contributions
9. `/partner/profile` - View/update contact info

---

## 11. IMPLEMENTATION CHECKLIST

### Week 1: Database & Migration
- [ ] Add new Prisma models (PartnerContribution, PartnerShare, PartnerAccessLog, PartnerPermission)
- [ ] Add User.partnerId link field
- [ ] Generate migration: `npm run db:migrate`
- [ ] Run migration seed script
- [ ] Verify all existing partners have PartnerShare and PartnerPermission records

### Week 2: API Implementation
- [ ] Implement `requirePartner()` middleware
- [ ] Create `/api/partner/dashboard` endpoint
- [ ] Create `/api/partner/profit-reports` endpoint
- [ ] Create `/api/partner/revenue` endpoint
- [ ] Create `/api/partner/sales` endpoint
- [ ] Create `/api/partner/expenses` endpoint
- [ ] Create `/api/partner/payroll-summary` endpoint
- [ ] Create `/api/partner/inventory-value` endpoint
- [ ] Create `/api/partner/my-*` endpoints (distributions, contributions, shares)
- [ ] Implement PartnerAccessLog middleware
- [ ] Add permission checking helper

### Week 3: Admin APIs
- [ ] Create `/api/admin/partners` CRUD endpoints
- [ ] Create `/api/admin/partners/[id]/contributions` endpoint
- [ ] Create `/api/admin/partners/[id]/distributions` endpoint
- [ ] Create `/api/admin/partners/[id]/permissions` endpoint
- [ ] Create `/api/admin/partners/[id]/access-logs` endpoint

### Week 4: Frontend (Basic)
- [ ] Create partner dashboard page
- [ ] Create profit reports page
- [ ] Create revenue/sales pages
- [ ] Create expense/payroll pages
- [ ] Create distribution history page
- [ ] Create contribution tracking page
- [ ] Add route protection for partner pages

### Week 5: Testing & Security
- [ ] Write unit tests for all partner APIs
- [ ] Test access control (partners can't see others' data)
- [ ] Test data sanitization (no PII leaks)
- [ ] Load test dashboard with 10 concurrent partners
- [ ] Security audit of all partner endpoints
- [ ] Manual QA with real partner accounts

### Week 6: Documentation & Training
- [ ] API documentation for partner endpoints
- [ ] User guide for partners
- [ ] Admin guide for managing partners
- [ ] Training session for partners
- [ ] Production deployment

---

## 12. MIGRATION SCRIPT EXAMPLE

```typescript
// scripts/migrate-partner-visibility.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting partner visibility migration...');
  
  // Step 1: Create PartnerShare for all existing partners
  const partners = await prisma.partner.findMany();
  console.log(`📊 Found ${partners.length} partners`);
  
  for (const partner of partners) {
    console.log(`Processing partner: ${partner.name}`);
    
    // Create share record
    await prisma.partnerShare.create({
      data: {
        partnerId: partner.id,
        shareType: 'PROFIT_SHARE',
        sharePercentage: partner.profitSharePercentage,
        effectiveDate: partner.joinDate,
        reason: 'Initial migration',
        isActive: true
      }
    });
    
    // Create initial contribution if exists
    if (partner.initialInvestment > 0) {
      await prisma.partnerContribution.create({
        data: {
          partnerId: partner.id,
          contributionType: 'INITIAL_CAPITAL',
          amount: partner.initialInvestment,
          description: 'Initial investment (migrated)',
          transactionDate: partner.joinDate,
          isVerified: true
        }
      });
    }
    
    // Create default permissions
    const modules = [
      'PROFIT_REPORTS',
      'SALES_REPORTS',
      'EXPENSE_REPORTS',
      'INVENTORY_REPORTS',
      'PROFIT_DISTRIBUTIONS'
    ];
    
    for (const module of modules) {
      await prisma.partnerPermission.create({
        data: {
          partnerId: partner.id,
          module,
          canView: true,
          canExport: true,
          canComment: false
        }
      });
    }
  }
  
  // Step 2: Link users to partners
  const partnerUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'PARTNER' },
        { isProfitPartner: true }
      ]
    }
  });
  
  console.log(`👥 Found ${partnerUsers.length} partner users`);
  
  for (const user of partnerUsers) {
    const partner = await prisma.partner.findUnique({
      where: { email: user.email }
    });
    
    if (partner) {
      await prisma.user.update({
        where: { id: user.id },
        data: { partnerId: partner.id }
      });
      console.log(`✅ Linked user ${user.email} to partner ${partner.name}`);
    }
  }
  
  console.log('✅ Migration complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 13. ROLLOUT PLAN

### Phase 1: Alpha (Internal Testing)
- Deploy to staging with 2-3 test partners
- Validate all calculations match admin reports
- Test access controls thoroughly

### Phase 2: Beta (Limited Partners)
- Roll out to 30% of partners
- Collect feedback
- Monitor API performance
- Fix any issues

### Phase 3: General Availability
- Deploy to all partners
- Announce via email
- Provide training/documentation
- Monitor for issues

### Phase 4: Enhancements
- Add mobile app support
- Add PDF export
- Add email alerts for distributions
- Add partner analytics (trends, comparisons)

---

**End of Partner Visibility Model Documentation**
