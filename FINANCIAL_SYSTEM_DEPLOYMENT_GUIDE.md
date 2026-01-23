# Financial System Implementation - Deployment Guide

## ✅ What Has Been Implemented

### 1. Database Schema Enhancements (`prisma/schema.prisma`)

#### New Models Added:
- **StockLot** - Tracks inventory purchases with cost per unit for FIFO/WAC
- **StockAllocation** - Audit trail for which lots were consumed by which orders

#### Enhanced Models:
- **Product** - Added `taxRate`, `taxInclusive`, `taxCategory` fields
- **Payment** - Added `paidAt`, `confirmedAt`, `receivedBy`, `approvedBy`, `attachmentUrl`, `gatewayResponse`

### 2. Service Layer (`src/services/`)

#### ✅ `inventoryService.ts` - Complete
- `addStockLot()` - Add new stock purchases with cost tracking
- `allocateStockFIFO()` - First-In-First-Out cost allocation
- `allocateStockWAC()` - Weighted Average Cost allocation
- `calculateWeightedAverageCost()` - WAC calculation
- `getProductStockLots()` - Query stock lots
- `checkStockAvailability()` - Validate stock before orders

#### ✅ `paymentService.ts` - Complete
- `calculateOrderDue()` - Calculate outstanding balance
- `recordPayment()` - Record partial or full payments
- `processRefund()` - Handle refunds with ledger entries
- `getOrderPayments()` - Get payment history
- `getPaymentSummary()` - Payment analytics
- `getOutstandingDues()` - All pending payments across orders
- `markOrderAsPaid()` - Quick mark-as-paid function

#### ✅ `orderFulfillmentService.ts` - Complete
- `completeOrderDelivery()` - Finalize COGS and profit on delivery
- `processOrderReturn()` - Handle returns with stock restoration
- `updateOrderStatus()` - Safe status updates with auto-completion
- `getOrderProfitReport()` - Get profit data for order
- `getProfitReports()` - Profit reports for date range
- `validateOrderForCompletion()` - Pre-completion validation

### 3. API Endpoints (`src/app/api/admin/`)

#### ✅ Inventory APIs
- `POST /api/admin/inventory/restock` - Add stock lot
- `GET /api/admin/inventory/restock` - List stock lots

#### ✅ Payment APIs
- `POST /api/admin/orders/[orderId]/payments` - Record payment
- `GET /api/admin/orders/[orderId]/payments` - Get payment info & dues

#### ✅ Order Completion APIs
- `POST /api/admin/orders/[orderId]/complete` - Complete & finalize COGS

### 4. Security & Access Control (`src/utils/dtoTransformers.ts`)

#### ✅ Role-Based Data Transformers
- `transformProduct()` - Hide cost data from customers
- `transformOrder()` - Hide profit margins from customers
- `transformPayment()` - Filter payment details by role
- `canViewCostData()` - Permission checks
- `canEditCostData()` - Edit permission checks
- `isAdmin()` - Admin role validation

**Protected Roles:**
- SUPER_ADMIN, ADMIN, PARTNER, MANAGER - Can view costs/profits
- SELLER, BUYER, GUEST - Cannot view internal financials

### 5. Documentation

#### ✅ Created Documents
1. **COMPREHENSIVE_FINANCIAL_SYSTEM_IMPLEMENTATION.md** - Full technical guide
2. **FINANCIAL_SYSTEM_DEPLOYMENT_GUIDE.md** (this file) - Deployment steps

---

## 📋 Next Steps - What You Need to Do

### Step 1: Run Database Migrations ⚠️ CRITICAL

```bash
# Generate and apply migrations
npx prisma migrate dev --name add_stock_lots_and_payment_enhancements

# Generate Prisma client
npx prisma generate
```

### Step 2: Add Environment Variables

Add to `.env`:

```env
# Costing Method (FIFO or WAC)
COSTING_METHOD=FIFO

# Tax Configuration  
DEFAULT_TAX_RATE=0
TAX_INCLUSIVE=false

# Charges
SHIPPING_CHARGE=0
HANDLING_CHARGE=0

# Platform Configuration
PLATFORM_PROFIT_PERCENTAGE=15
DEFAULT_SELLER_COMMISSION=10

# Financial Year
FISCAL_YEAR_START_MONTH=1
```

### Step 3: Additional APIs to Create

#### 3.1 Expenses API (`src/app/api/admin/expenses/route.ts`)

```typescript
// POST /api/admin/expenses - Create expense
// GET /api/admin/expenses - List expenses
// POST /api/admin/expenses/[id]/approve - Approve expense
```

**Reference existing operational cost model in schema.**

#### 3.2 Financial Dashboard API (`src/app/api/admin/dashboard/financial/route.ts`)

```typescript
// GET /api/admin/dashboard/financial
// Query params: period (today, week, month, year), startDate, endDate
// Returns: revenue, COGS, expenses, profit metrics
```

**Example implementation in COMPREHENSIVE_FINANCIAL_SYSTEM_IMPLEMENTATION.md (Phase 5).**

#### 3.3 Refund API (`src/app/api/admin/orders/[orderId]/refund/route.ts`)

```typescript
// POST /api/admin/orders/[orderId]/refund
// Body: { amount, reason, refundMethod }
```

#### 3.4 Return API (`src/app/api/admin/orders/[orderId]/return/route.ts`)

```typescript
// POST /api/admin/orders/[orderId]/return
// Body: { reason, restockItems }
```

### Step 4: Frontend Integration

#### 4.1 Admin Dashboard Pages to Build

1. **Restock Page** (`/admin/inventory/restock`)
   - Form to add stock lots
   - List of recent stock lots
   - Product selector with search

2. **Order Details Enhancement** (`/admin/orders/[id]`)
   - Payment recording form
   - Payment history table
   - Due amount display
   - "Complete Order" button
   - COGS and profit display (after completion)

3. **Financial Dashboard** (`/admin/dashboard/financial`)
   - Revenue cards
   - Expense breakdown
   - Profit margins
   - Outstanding dues
   - Date range filters

4. **Expense Management** (`/admin/expenses`)
   - Create expense form
   - Expense list with filters
   - Approval workflow
   - Category breakdown

#### 4.2 Example API Calls

**Add Stock Lot:**
```typescript
const response = await fetch('/api/admin/inventory/restock', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productId: 'prod_123',
    quantity: 100,
    costPerUnit: 50.00,
    supplierName: 'ABC Suppliers',
    notes: 'Bulk purchase Q1 2026',
  }),
});
```

**Record Payment:**
```typescript
const response = await fetch(`/api/admin/orders/${orderId}/payments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 5000.00,
    method: 'BANK_TRANSFER',
    transactionId: 'TXN123456',
    notes: 'Partial payment received',
  }),
});
```

**Complete Order:**
```typescript
const response = await fetch(`/api/admin/orders/${orderId}/complete`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    costingMethod: 'FIFO', // or 'WAC'
  }),
});
```

### Step 5: Update Existing Order Creation Flow

#### In `src/app/api/orders/route.ts`:

**Remove or update the old profit calculation:**
- The old code calculates profit immediately on order creation
- With the new system, profit is calculated on delivery completion
- Update to only validate stock availability during order creation
- Remove profit field updates during creation

**Recommended changes:**
```typescript
// In order creation, only validate stock
for (const item of items) {
  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: { id: true, name: true, stockQuantity: true }
  });
  
  if (!product || product.stockQuantity < item.quantity) {
    throw new Error(`Insufficient stock for ${product?.name}`);
  }
}

// Don't deduct stock here anymore - wait for completion
// Stock is deducted in completeOrderDelivery()
```

### Step 6: Testing Checklist

#### 6.1 Inventory Flow Testing
- [ ] Add stock lot for product A (cost: $50/unit, qty: 100)
- [ ] Add stock lot for product A (cost: $55/unit, qty: 50)
- [ ] Verify product stock quantity increased to 150
- [ ] Check financial ledger has purchase entries

#### 6.2 Order Flow Testing
- [ ] Create order with 30 units of product A
- [ ] Verify stock NOT deducted yet
- [ ] Update order status to DELIVERED
- [ ] Call complete API
- [ ] Verify FIFO: uses $50 cost for all 30 units
- [ ] Verify stock deducted to 120
- [ ] Verify order has COGS and profit data
- [ ] Check profit report created

#### 6.3 Payment Flow Testing
- [ ] Create order for $1000
- [ ] Record payment of $600
- [ ] Verify order status = PARTIAL
- [ ] Verify due = $400
- [ ] Record payment of $400
- [ ] Verify order status = PAID
- [ ] Check financial ledger has credit entries

#### 6.4 WAC Testing
- [ ] Create order after adding multiple lots at different costs
- [ ] Complete with WAC method
- [ ] Verify average cost used instead of FIFO

#### 6.5 Return Testing
- [ ] Complete an order
- [ ] Process return
- [ ] Verify stock restored
- [ ] Verify ledger has return entry

#### 6.6 Security Testing
- [ ] Access product API as guest - verify no cost data in response
- [ ] Access product API as admin - verify cost data present
- [ ] Try to access /admin endpoints without auth - verify 401
- [ ] Try to access /admin endpoints as BUYER - verify 403

### Step 7: Operational Procedures

#### Daily Operations

**Morning Routine:**
1. Check outstanding dues: `GET /api/admin/financial/outstanding-dues`
2. Review pending orders needing completion
3. Process any refund requests

**After Order Delivery:**
1. Update order status to DELIVERED
2. Call completion API: `POST /api/admin/orders/{id}/complete`
3. Verify COGS and profit calculated correctly

**When Receiving Payment:**
1. Navigate to order details
2. Click "Record Payment"
3. Enter amount, method, transaction ID
4. Verify due amount updates

**Month-End:**
1. View financial dashboard for the month
2. Review profit/loss report
3. Approve all operational expenses
4. Export financial ledger for accounting

#### Restocking Procedure

**When Purchasing Inventory:**
1. Go to Admin → Inventory → Restock
2. Select product
3. Enter:
   - Quantity received
   - Cost per unit (buying price - PRIVATE)
   - Supplier information
   - Purchase order reference
   - Expiry date (if applicable)
4. Submit
5. Verify stock quantity increased
6. Verify financial ledger shows purchase

---

## 🔒 Security Reminders

### CRITICAL: Cost Data Protection

**NEVER expose these fields to customers:**
- `costPerUnit`
- `basePrice` (if different from wholesale)
- `totalCost` (order level)
- `grossProfit`
- `platformProfit`
- `sellerProfit`
- `profitMargin`
- Stock lot information

**Always use DTO transformers:**
```typescript
import { transformProduct, transformOrder } from '@/utils/dtoTransformers';

// In customer-facing APIs
const safeProduct = transformProduct(product, authenticatedUser);
```

### API Security Checklist
- [ ] All `/admin/*` routes use `requireAdmin()`
- [ ] Customer APIs use DTO transformers
- [ ] Financial ledger accessible only to admin/partner
- [ ] Stock lots hidden from non-admin users
- [ ] Payment details filtered by role

---

## 📊 Reports & Analytics

### Available Reports

1. **Profit by Order**
   - Order number, revenue, COGS, profit, margin
   - Date range filters
   - Export to CSV

2. **Profit by Product**
   - Top/bottom performers
   - Quantity sold, revenue, profit
   - Trend analysis

3. **Outstanding Dues**
   - Customer name, order number, due amount
   - Aging (0-30, 31-60, 60+ days)
   - Payment reminders

4. **Inventory Valuation**
   - Current stock value by product
   - FIFO vs WAC comparison
   - Low stock alerts

5. **Expense Breakdown**
   - By category (rent, salaries, utilities)
   - Month-over-month trends
   - Budget vs actual

### Dashboard Metrics

**Real-time Cards:**
- Today's Revenue
- Today's Profit
- Outstanding Dues
- Pending Orders

**Charts:**
- Revenue trend (line chart)
- Expense breakdown (pie chart)
- Top products by profit (bar chart)
- Payment methods distribution

---

## ❓ Troubleshooting

### Issue: "Insufficient stock" error during completion

**Cause:** Stock already deducted or oversold  
**Solution:** Check inventory logs, verify stock quantity, add stock lot if needed

### Issue: COGS not calculating correctly

**Cause:** Missing stock lots or incorrect cost entries  
**Solution:** 
1. Check stock lots exist for product
2. Verify `quantityRemaining > 0`
3. Check `costPerUnit` is set correctly

### Issue: Duplicate transaction ID error

**Cause:** Same transaction ID used twice  
**Solution:** Use unique transaction IDs or leave blank for auto-generation

### Issue: Order won't complete

**Cause:** Not in DELIVERED status  
**Solution:** Update order status to DELIVERED first, then call complete API

### Issue: Customer can see cost data

**Cause:** DTO transformer not applied  
**Solution:** Ensure all customer-facing APIs use `transformProduct()` or `transformOrder()`

---

## 🎯 Success Criteria

### Your system is working correctly when:

- ✅ Stock lots are created with buying cost
- ✅ FIFO allocates oldest stock first
- ✅ WAC calculates correct average
- ✅ Orders show profit only after completion
- ✅ Partial payments track correctly
- ✅ Due amounts calculate accurately
- ✅ Customers never see cost/profit data
- ✅ Admins see full financial details
- ✅ Financial ledger has all transactions
- ✅ Profit reports match actual calculations
- ✅ Returns restore stock correctly
- ✅ Refunds create negative payments

---

## 📞 Need Help?

### Reference Documents:
1. **COMPREHENSIVE_FINANCIAL_SYSTEM_IMPLEMENTATION.md** - Full technical details
2. **Prisma Schema** - All models and relations
3. **Service Files** - Business logic implementation
4. **API Files** - Endpoint implementations

### Common Questions Answered:

**Q: FIFO or WAC?**  
A: FIFO is simpler and more common. Use WAC if costs fluctuate frequently.

**Q: Tax inclusive or exclusive?**  
A: Exclusive is simpler for B2B. Set `TAX_INCLUSIVE=false`.

**Q: When to complete order?**  
A: When order status changes to DELIVERED (goods handed over to customer).

**Q: Can I edit COGS after completion?**  
A: No, COGS is locked after completion. Process return if needed.

**Q: How to handle damaged goods?**  
A: Create inventory adjustment with action: DAMAGE. Stock reduced without order.

---

**Implementation Date:** January 23, 2026  
**System Status:** ✅ Core Implementation Complete  
**Deployment Status:** ⚠️ Pending Migration and Testing

**Next Action:** Run `npx prisma migrate dev` to apply schema changes.
