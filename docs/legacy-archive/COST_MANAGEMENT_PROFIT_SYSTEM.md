# Cost Management and Partner Profit Distribution System

## Overview
Complete financial management system with operational cost tracking, multiple partner profit sharing, and comprehensive profit calculations across daily, weekly, monthly, and yearly periods.

---

## Database Models

### 1. OperationalCost (Already Exists)
Tracks all business operational costs including employee transport, utilities, etc.

```typescript
model OperationalCost {
  id          String   @id @default(cuid())
  date        DateTime
  category    String   // RENT, UTILITIES, SALARIES, TRANSPORTATION, etc.
  amount      Float
  description String?
  reference   String?
  approved    Boolean  @default(false)
  approvedBy  String?
  approvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Categories**: RENT, UTILITIES, SALARIES, TRANSPORTATION, RAW_MATERIALS, INVENTORY, MARKETING, MAINTENANCE, INSURANCE, TAXES, PACKAGING, SHIPPING, OFFICE_SUPPLIES, PROFESSIONAL_SERVICES, EQUIPMENT, FUEL, TRAVEL, COMMUNICATION, BANKING_FEES, MISCELLANEOUS, OTHER

### 2. Partner (New)
Manages multiple business partners with different profit share percentages.

```typescript
model Partner {
  id                     String   @id @default(cuid())
  name                   String
  email                  String?  @unique
  phone                  String?
  profitSharePercentage  Float    // 0-100%
  isActive               Boolean  @default(true)
  partnerType            String?  // INVESTOR, MANAGING, SILENT, etc.
  joinDate               DateTime @default(now())
  exitDate               DateTime?
  initialInvestment      Float?
  totalProfitReceived    Float    @default(0)
  address                String?
  taxId                  String?
  bankAccount            String?
  notes                  String?
  profitDistributions    ProfitDistribution[]
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

### 3. ProfitDistribution (New)
Tracks profit distributions to each partner for different time periods.

```typescript
model ProfitDistribution {
  id                  String   @id @default(cuid())
  partnerId           String
  partner             Partner  @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  periodType          String   // DAILY, WEEKLY, MONTHLY, YEARLY
  startDate           DateTime
  endDate             DateTime
  totalRevenue        Float
  totalCosts          Float
  netProfit           Float
  partnerShare        Float    // Percentage at time of distribution
  distributionAmount  Float    // Calculated: netProfit * (partnerShare / 100)
  status              String   @default("PENDING") // PENDING, APPROVED, PAID
  approvedBy          String?
  approvedAt          DateTime?
  paidAt              DateTime?
  paymentMethod       String?
  paymentReference    String?
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

---

## API Endpoints

### Partners Management

#### `GET /api/admin/partners`
Get all partners with distribution history.

**Query Parameters:**
- `isActive` (optional): Filter by active status (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "partners": [
      {
        "id": "partner_id",
        "name": "Partner Name",
        "profitSharePercentage": 30.0,
        "isActive": true,
        "totalProfitReceived": 125000.00,
        "profitDistributions": [...]
      }
    ],
    "summary": {
      "total": 3,
      "active": 3,
      "totalActiveShare": 100.0,
      "remainingShare": 0
    }
  }
}
```

#### `POST /api/admin/partners`
Create a new partner.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+880123456789",
  "profitSharePercentage": 30.0,
  "partnerType": "MANAGING",
  "initialInvestment": 500000.00,
  "address": "123 Main St",
  "taxId": "TAX123",
  "bankAccount": "ACC123456",
  "notes": "Managing partner"
}
```

**Validation:**
- Total active partner shares cannot exceed 100%
- Profit share must be between 0-100
- Email must be unique

#### `PATCH /api/admin/partners/[id]`
Update partner details including profit share percentage.

**Request Body:**
```json
{
  "profitSharePercentage": 35.0,
  "isActive": true,
  "notes": "Updated share"
}
```

**Important:** Admin can edit profit share percentage anytime. System validates total doesn't exceed 100%.

#### `DELETE /api/admin/partners/[id]`
Delete a partner.

---

### Profit Calculations

#### `GET /api/admin/profits?action=summary&period=THIS_MONTH`
Get profit summary for dashboard.

**Query Parameters:**
- `action=summary`
- `period`: TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 500000.00,
    "grossProfit": 200000.00,
    "totalOperationalCosts": 75000.00,
    "netProfit": 125000.00,
    "netMargin": 25.0,
    "salesCount": 150,
    "unitsSold": 1200,
    "costsByCategory": {
      "SALARIES": 30000.00,
      "TRANSPORTATION": 15000.00,
      "RENT": 20000.00,
      "UTILITIES": 10000.00
    }
  }
}
```

#### `GET /api/admin/profits?startDate=2024-01-01&endDate=2024-01-31`
Calculate profit for specific period.

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string

#### `GET /api/admin/profits?action=trends&startDate=2024-01-01&endDate=2024-12-31&groupBy=MONTH`
Get profit trends for charts.

**Query Parameters:**
- `action=trends`
- `startDate`, `endDate`: Date range
- `groupBy`: DAY, WEEK, MONTH

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2024-01",
        "revenue": 450000.00,
        "profit": 180000.00,
        "costs": 65000.00,
        "netProfit": 115000.00
      }
    ]
  }
}
```

#### `POST /api/admin/profits`
Distribute profit to partners.

**Request Body:**
```json
{
  "action": "distribute",
  "periodType": "MONTHLY",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Created 3 profit distributions",
  "data": {
    "profitData": {
      "totalRevenue": 500000.00,
      "grossProfit": 200000.00,
      "totalOperationalCosts": 75000.00,
      "netProfit": 125000.00
    },
    "distributions": [
      {
        "id": "dist_1",
        "partnerId": "partner_1",
        "partnerShare": 30.0,
        "distributionAmount": 37500.00,
        "status": "PENDING"
      }
    ]
  }
}
```

---

### Profit Distributions

#### `GET /api/admin/distributions`
Get all profit distributions.

**Query Parameters:**
- `partnerId` (optional): Filter by partner
- `status` (optional): PENDING, APPROVED, PAID
- `periodType` (optional): DAILY, WEEKLY, MONTHLY, YEARLY

**Response:**
```json
{
  "success": true,
  "data": {
    "distributions": [...],
    "summary": {
      "total": 12,
      "totalAmount": 375000.00,
      "pending": 3,
      "approved": 2,
      "paid": 7
    }
  }
}
```

#### `PATCH /api/admin/distributions`
Update distribution status (approve/pay).

**Request Body:**
```json
{
  "id": "dist_id",
  "status": "PAID",
  "paymentMethod": "BANK_TRANSFER",
  "paymentReference": "TXN123456",
  "notes": "Paid via bank transfer"
}
```

---

## Profit Calculation Formula

### Step 1: Calculate Revenue
```
Total Revenue = Sum of all Sale.totalAmount where:
  - saleDate between startDate and endDate
  - isDelivered = true
```

### Step 2: Calculate Gross Profit
```
Gross Profit = Sum of all Sale.profitAmount
  (profitAmount = (unitPrice - costPrice) × quantity)
```

### Step 3: Calculate Operational Costs
```
Total Operational Costs = Sum of all OperationalCost.amount where:
  - date between startDate and endDate
  - All categories: TRANSPORTATION, SALARIES, RENT, etc.
```

### Step 4: Calculate Net Profit
```
Net Profit = Gross Profit - Total Operational Costs
```

### Step 5: Distribute to Partners
```
For each active partner:
  Distribution Amount = Net Profit × (partner.profitSharePercentage / 100)
```

---

## Example Scenario

### Business Setup
- **Partner A**: 40% share (Investor)
- **Partner B**: 35% share (Managing Partner)
- **Partner C**: 25% share (Silent Partner)

### Monthly Calculation (January 2024)

**Revenue:**
- Total Sales: ৳500,000
- Gross Profit: ৳200,000

**Operational Costs:**
- Salaries: ৳30,000
- Employee Transport: ৳15,000
- Rent: ৳20,000
- Utilities: ৳10,000
- **Total Costs: ৳75,000**

**Net Profit:**
```
Net Profit = ৳200,000 - ৳75,000 = ৳125,000
```

**Partner Distributions:**
- Partner A (40%): ৳125,000 × 0.40 = ৳50,000
- Partner B (35%): ৳125,000 × 0.35 = ৳43,750
- Partner C (25%): ৳125,000 × 0.25 = ৳31,250

---

## Utility Functions

### `calculateProfitForPeriod(startDate, endDate)`
Calculates complete profit breakdown for any period.

### `distributeProfitToPartners(periodType, startDate, endDate)`
Creates ProfitDistribution records for all active partners.

### `getProfitSummary(period)`
Quick summary for dashboard (TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR).

### `generateDailyProfitReport(date)`
Generate report for specific day.

### `generateMonthlyProfitReport(month, year)`
Generate report for specific month.

### `generateYearlyProfitReport(year)`
Generate report for specific year.

### `getProfitTrends(startDate, endDate, groupBy)`
Get trend data for charts (groupBy: DAY, WEEK, MONTH).

---

## Features

### ✅ Cost Management
- Track all operational costs with 20+ categories
- Employee transport costs included
- Daily operations costs tracked
- Approval workflow for cost entries

### ✅ Multiple Partners
- Support for unlimited partners
- Different profit share percentages
- Partner types: INVESTOR, MANAGING, SILENT, etc.
- Track initial investment and total profit received

### ✅ Editable Profit Shares
- Admin can edit partner shares anytime
- Automatic validation (total ≤ 100%)
- Historical tracking of share changes in distributions

### ✅ Comprehensive Profit Calculations
- **Daily**: Profit for any single day
- **Weekly**: Sunday to Saturday calculations
- **Monthly**: Calendar month calculations
- **Yearly**: Full year calculations
- Custom date range support

### ✅ All Costs Included
- Automatically includes ALL operational costs
- Breakdown by category
- Cost trends over time
- Cost impact on profit margins

### ✅ Distribution Workflow
1. **Calculate** profit for period
2. **Create** distribution records (PENDING status)
3. **Approve** distributions (admin review)
4. **Pay** partners (update to PAID status)
5. **Track** payment methods and references

---

## Usage Examples

### 1. Create Partners
```bash
# Partner A - 40% share
POST /api/admin/partners
{
  "name": "Partner A",
  "profitSharePercentage": 40,
  "partnerType": "INVESTOR"
}

# Partner B - 35% share
POST /api/admin/partners
{
  "name": "Partner B",
  "profitSharePercentage": 35,
  "partnerType": "MANAGING"
}

# Partner C - 25% share
POST /api/admin/partners
{
  "name": "Partner C",
  "profitSharePercentage": 25,
  "partnerType": "SILENT"
}
```

### 2. Record Daily Costs
```bash
POST /api/admin/costs
{
  "date": "2024-01-15",
  "category": "TRANSPORTATION",
  "amount": 5000,
  "description": "Employee transport - January 15"
}
```

### 3. Calculate Monthly Profit
```bash
GET /api/admin/profits?startDate=2024-01-01&endDate=2024-01-31
```

### 4. Distribute Profit to Partners
```bash
POST /api/admin/profits
{
  "action": "distribute",
  "periodType": "MONTHLY",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

### 5. Approve Distribution
```bash
PATCH /api/admin/distributions
{
  "id": "dist_123",
  "status": "APPROVED",
  "approvedBy": "admin_id"
}
```

### 6. Mark as Paid
```bash
PATCH /api/admin/distributions
{
  "id": "dist_123",
  "status": "PAID",
  "paymentMethod": "BANK_TRANSFER",
  "paymentReference": "TXN20240131"
}
```

### 7. Update Partner Share
```bash
PATCH /api/admin/partners/partner_123
{
  "profitSharePercentage": 45
}
```

---

## Next Steps: UI Implementation

Create admin pages for:

1. **Partners Management** (`/admin/partners`)
   - List all partners
   - Add/Edit partner details
   - Edit profit shares
   - View distribution history

2. **Profit Dashboard** (`/admin/profits`)
   - Summary cards (TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR)
   - Profit trends chart
   - Cost breakdown pie chart
   - Recent distributions list

3. **Distributions Management** (`/admin/distributions`)
   - List all distributions
   - Filter by partner/status/period
   - Approve/reject pending distributions
   - Mark as paid with payment details

4. **Cost Management UI** (enhance existing)
   - Cost entry form
   - Category-wise breakdown
   - Cost trends over time

---

## Database Migration

Migration already applied:
```
✅ 20260105133459_add_partner_profit_distribution
```

Tables created:
- `partners`
- `profit_distributions`

---

## File Structure

```
src/
├── app/api/admin/
│   ├── partners/
│   │   ├── route.ts           # GET (list), POST (create)
│   │   └── [id]/route.ts      # GET (one), PATCH (update), DELETE
│   ├── profits/
│   │   └── route.ts           # GET (calculate), POST (distribute)
│   ├── distributions/
│   │   └── route.ts           # GET (list), PATCH (approve/pay)
│   └── costs/
│       └── route.ts           # Already exists
└── utils/
    └── partnerProfitDistribution.ts  # All calculation functions
```

---

## System Complete ✅

All backend functionality implemented:
- ✅ Database models
- ✅ Partner CRUD APIs
- ✅ Profit calculation utilities
- ✅ Distribution management APIs
- ✅ Cost tracking (already existed)
- ✅ All periods: Daily/Weekly/Monthly/Yearly
- ✅ Editable profit shares with validation
- ✅ Complete profit calculation with all costs

**Ready for frontend UI development!**
