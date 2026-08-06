# 🔍 Prisma Schema Audit - Multi-Partner Wholesale Marketplace
**Date:** January 19, 2026  
**Current Schema Lines:** 1,182  
**Current Models:** 28

---

## 📋 EXECUTIVE SUMMARY

### Current Strengths ✅
- Strong foundation for B2B/Wholesale operations
- Comprehensive user & permission system
- Robust profit tracking & partner management
- Good inventory & sales tracking
- Audit trails in place

### Critical Gaps 🔴
1. **No true Partner/Vendor entity** (using Partner for profit-sharing only)
2. **No Product ownership/commission tracking** (weak sellerId relation)
3. **Missing financial accounting models** (invoices, credit notes, journals)
4. **No product analytics** (views, conversions, click tracking)
5. **No reviews/ratings system** (only placeholder fields)
6. **Warehouse underutilized** (model exists, no relations)
7. **Weak cost accounting** (no line-item COGS, fees, taxes)
8. **No return/refund entities**
9. **No order event tracking**

---

## 🏢 SECTION 1: PARTNER/VENDOR MANAGEMENT

### Current State
**Model:** `Partner` (lines 1078-1105)
- ✅ Basic partner info (name, email, phone)
- ✅ Profit share percentage
- ✅ Initial investment tracking
- ❌ **NO product ownership linkage**
- ❌ **NO commission structure**
- ❌ **NO performance metrics**
- ❌ **NO vendor-specific settings**

**Issues:**
1. `Partner` is profit-sharing focused, not vendor-focused
2. `Product.sellerId` links to `User`, not `Partner` (weak typing)
3. No commission tracking per product/category
4. No vendor payout statements
5. No vendor performance KPIs

### Recommended Schema Changes

#### 1.1: New `Vendor` Model (Separate from Partner)
```prisma
// Multi-vendor marketplace seller/supplier
model Vendor {
  id String @id @default(cuid())
  
  // Business Identity
  businessName String
  legalName String?
  vendorCode String @unique // VEN-001, VEN-002
  vendorType VendorType // MANUFACTURER, DISTRIBUTOR, DROPSHIPPER, WHOLESALER
  
  // Contact
  contactName String
  contactEmail String @unique
  contactPhone String
  alternatePhone String?
  
  // Business Details
  registrationNumber String?
  taxId String?
  tradeLicenseNumber String?
  bankName String?
  bankAccountNumber String?
  bankAccountName String?
  mobileBankingAccount String? // bKash/Nagad
  
  // Address
  businessAddress String
  city String
  state String?
  country String @default("Bangladesh")
  postalCode String?
  
  // Platform Settings
  isActive Boolean @default(true)
  isVerified Boolean @default(false)
  verifiedAt DateTime?
  verifiedBy String? // Admin userId
  
  // Commission & Pricing
  defaultCommissionPercent Float @default(15) // Platform's commission
  customCommissionEnabled Boolean @default(false)
  allowCustomPricing Boolean @default(true)
  
  // Performance
  rating Float @default(0) // Average vendor rating
  totalSales Float @default(0)
  totalOrders Int @default(0)
  completedOrders Int @default(0)
  cancelledOrders Int @default(0)
  returnRate Float @default(0) // % of orders returned
  
  // Financial
  creditLimit Float @default(0)
  currentBalance Float @default(0) // Amount owed to vendor
  totalPaidOut Float @default(0) // Lifetime payouts
  
  // Operational
  fulfillmentMethod FulfillmentMethod @default(VENDOR_SHIPS)
  avgFulfillmentTime Int? // Hours
  minOrderValue Float? // Minimum order value
  
  // Metadata
  notes String?
  tags String[] @default([])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  products Product[] @relation("VendorProducts")
  commissions VendorCommission[]
  payouts VendorPayout[]
  warehouses VendorWarehouse[]
  reviews VendorReview[]
  settlements VendorSettlement[]
  
  @@index([vendorCode])
  @@index([isActive])
  @@index([isVerified])
  @@index([contactEmail])
  @@map("vendors")
}

enum VendorType {
  MANUFACTURER
  DISTRIBUTOR
  WHOLESALER
  DROPSHIPPER
  IMPORTER
  BRAND_OWNER
}

enum FulfillmentMethod {
  VENDOR_SHIPS // Vendor handles shipping
  PLATFORM_SHIPS // Platform handles shipping
  DROPSHIP // Direct from manufacturer
}
```

#### 1.2: Vendor-Product Association Enhancement
```prisma
// Update Product model to use Vendor instead of User
model Product {
  // ... existing fields ...
  
  // REPLACE:
  // sellerId String?
  // seller User? @relation(...)
  
  // WITH:
  vendorId String?
  vendor Vendor? @relation("VendorProducts", fields: [vendorId], references: [id], onDelete: SetNull)
  
  // Add vendor-specific fields
  vendorSku String? // Vendor's internal SKU
  vendorCostPrice Float? // What platform pays vendor
  platformMarkup Float? // Platform's markup %
  
  @@index([vendorId])
}
```

#### 1.3: Vendor Commission Tracking
```prisma
// Track commission per product/category/order
model VendorCommission {
  id String @id @default(cuid())
  vendorId String
  
  // Scope
  applicationType CommissionApplicationType // PRODUCT, CATEGORY, GLOBAL
  productId String? // If product-specific
  categoryId String? // If category-specific
  
  // Commission Structure
  commissionType CommissionType // PERCENTAGE, FIXED
  commissionValue Float // % or fixed amount
  
  // Conditions
  minOrderValue Float?
  maxOrderValue Float?
  validFrom DateTime @default(now())
  validUntil DateTime?
  
  isActive Boolean @default(true)
  priority Int @default(0) // Higher priority wins
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  
  @@index([vendorId])
  @@index([applicationType])
  @@index([productId])
  @@index([categoryId])
  @@map("vendor_commissions")
}

enum CommissionApplicationType {
  GLOBAL // All vendor products
  CATEGORY // Specific category
  PRODUCT // Specific product
}

enum CommissionType {
  PERCENTAGE // % of sale price
  FIXED // Fixed amount per unit
}
```

#### 1.4: Vendor Payout System
```prisma
// Track payouts to vendors
model VendorPayout {
  id String @id @default(cuid())
  vendorId String
  payoutNumber String @unique // PAY-2026-001
  
  // Period
  periodType PayoutPeriodType // WEEKLY, MONTHLY, ON_DEMAND
  periodStart DateTime
  periodEnd DateTime
  
  // Financial
  totalSales Float // Total sales in period
  platformCommission Float // Platform's commission amount
  vendorShare Float // Amount due to vendor
  adjustments Float @default(0) // Refunds, returns, fees
  netPayout Float // Final amount paid
  
  // Tax & Fees
  taxDeducted Float @default(0) // TDS or similar
  processingFee Float @default(0)
  
  // Status
  status PayoutStatus @default(PENDING)
  
  // Payment Details
  paymentMethod String? // Bank Transfer, Mobile Banking
  paymentReference String?
  paidAt DateTime?
  
  // Metadata
  notes String?
  attachmentUrl String? // Payment proof/statement
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  orderItems VendorPayoutItem[]
  
  @@index([vendorId])
  @@index([status])
  @@index([periodStart, periodEnd])
  @@index([payoutNumber])
  @@map("vendor_payouts")
}

enum PayoutPeriodType {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  ON_DEMAND
}

enum PayoutStatus {
  PENDING
  PROCESSING
  APPROVED
  PAID
  CANCELLED
  DISPUTED
}

// Line items in a payout
model VendorPayoutItem {
  id String @id @default(cuid())
  payoutId String
  orderId String
  orderItemId String
  
  productId String
  productName String
  quantity Int
  
  itemPrice Float // Selling price
  vendorCost Float // What vendor gets
  commission Float // Platform commission
  
  createdAt DateTime @default(now())
  
  // Relations
  payout VendorPayout @relation(fields: [payoutId], references: [id], onDelete: Cascade)
  
  @@index([payoutId])
  @@index([orderId])
  @@map("vendor_payout_items")
}
```

#### 1.5: Vendor Settlements (Reconciliation)
```prisma
// Monthly settlement/reconciliation with vendors
model VendorSettlement {
  id String @id @default(cuid())
  vendorId String
  settlementNumber String @unique // SET-2026-JAN-001
  
  // Period
  month Int
  year Int
  
  // Financials
  openingBalance Float @default(0) // From last settlement
  totalSales Float
  totalCommission Float
  totalRefunds Float
  totalAdjustments Float
  totalPayouts Float
  closingBalance Float // Carried forward
  
  // Status
  status SettlementStatus @default(DRAFT)
  reconciledAt DateTime?
  reconciledBy String? // Admin userId
  
  // Documents
  statementUrl String? // PDF statement
  
  notes String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  
  @@unique([vendorId, month, year])
  @@index([vendorId])
  @@index([status])
  @@map("vendor_settlements")
}

enum SettlementStatus {
  DRAFT
  FINALIZED
  APPROVED
  DISPUTED
  RESOLVED
}
```

---

## 🏭 SECTION 2: WAREHOUSE & INVENTORY ENHANCEMENT

### Current State
**Model:** `Warehouse` (lines 719-723)
- ✅ Basic warehouse info exists
- ❌ **NO product-warehouse relation**
- ❌ **NO stock per warehouse**
- ❌ **NO transfer tracking**

### Recommended Schema Changes

#### 2.1: Vendor-Warehouse Association
```prisma
// Link warehouses to vendors
model VendorWarehouse {
  id String @id @default(cuid())
  vendorId String
  warehouseId String
  
  isPrimary Boolean @default(false)
  canFulfillOrders Boolean @default(true)
  
  // Relations
  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  
  @@unique([vendorId, warehouseId])
  @@index([vendorId])
  @@index([warehouseId])
  @@map("vendor_warehouses")
}

// Update Warehouse model to add relations
model Warehouse {
  // ... existing fields ...
  
  // Relations (ADD)
  vendorWarehouses VendorWarehouse[]
  productStocks ProductWarehouseStock[]
  stockTransfers StockTransfer[] @relation("SourceWarehouse")
  stockTransfersIn StockTransfer[] @relation("DestinationWarehouse")
}
```

#### 2.2: Product Stock Per Warehouse
```prisma
// Multi-warehouse inventory tracking
model ProductWarehouseStock {
  id String @id @default(cuid())
  productId String
  warehouseId String
  
  quantity Int @default(0)
  reservedQuantity Int @default(0) // Allocated to pending orders
  availableQuantity Int @default(0) // quantity - reservedQuantity
  
  reorderLevel Int @default(10)
  reorderQuantity Int @default(50)
  
  // Cost tracking per warehouse
  averageCostPerUnit Float?
  lastPurchasePrice Float?
  lastPurchaseDate DateTime?
  
  lastUpdated DateTime @default(now())
  updatedBy String?
  
  // Relations
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  
  @@unique([productId, warehouseId])
  @@index([productId])
  @@index([warehouseId])
  @@index([availableQuantity])
  @@map("product_warehouse_stocks")
}

// Update Product model
model Product {
  // ... existing fields ...
  
  // Relations (ADD)
  warehouseStocks ProductWarehouseStock[]
}
```

#### 2.3: Stock Transfer Between Warehouses
```prisma
// Track stock movement between warehouses
model StockTransfer {
  id String @id @default(cuid())
  transferNumber String @unique // TRF-2026-001
  
  productId String
  sourceWarehouseId String
  destinationWarehouseId String
  
  quantity Int
  reason String?
  
  status TransferStatus @default(PENDING)
  
  requestedBy String
  requestedAt DateTime @default(now())
  
  approvedBy String?
  approvedAt DateTime?
  
  shippedBy String?
  shippedAt DateTime?
  
  receivedBy String?
  receivedAt DateTime?
  
  notes String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  product Product @relation(fields: [productId], references: [id])
  sourceWarehouse Warehouse @relation("SourceWarehouse", fields: [sourceWarehouseId], references: [id])
  destinationWarehouse Warehouse @relation("DestinationWarehouse", fields: [destinationWarehouseId], references: [id])
  
  @@index([productId])
  @@index([sourceWarehouseId])
  @@index([destinationWarehouseId])
  @@index([status])
  @@map("stock_transfers")
}

enum TransferStatus {
  PENDING
  APPROVED
  IN_TRANSIT
  RECEIVED
  CANCELLED
}
```

---

## 💰 SECTION 3: FINANCIAL ACCOUNTING ENHANCEMENT

### Current State
- ✅ Basic payment tracking exists
- ✅ Profit reports exist
- ❌ **NO invoice generation**
- ❌ **NO credit notes**
- ❌ **NO financial journals**
- ❌ **NO tax calculation per line item**
- ❌ **NO return impact on COGS**

### Recommended Schema Changes

#### 3.1: Invoice Management
```prisma
// Comprehensive invoice system
model Invoice {
  id String @id @default(cuid())
  invoiceNumber String @unique // INV-2026-001
  invoiceType InvoiceType @default(SALES)
  
  // Relations
  orderId String? // If order-based
  vendorId String? // If purchase invoice
  customerId String? // If customer invoice
  
  // Dates
  invoiceDate DateTime @default(now())
  dueDate DateTime?
  
  // Amounts
  subtotal Float
  discountAmount Float @default(0)
  taxAmount Float @default(0)
  shippingAmount Float @default(0)
  adjustmentAmount Float @default(0)
  totalAmount Float
  
  paidAmount Float @default(0)
  balanceAmount Float // totalAmount - paidAmount
  
  // Status
  status InvoiceStatus @default(DRAFT)
  
  // Payment Terms
  paymentTerms String? // Net 30, Net 60, etc.
  
  // Billing Info
  billingName String
  billingEmail String?
  billingPhone String?
  billingAddress String
  
  // Tax Info
  taxId String?
  taxRate Float @default(0)
  
  // Metadata
  notes String?
  internalNotes String?
  termsAndConditions String?
  
  // Documents
  pdfUrl String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  lineItems InvoiceLineItem[]
  payments InvoicePayment[]
  creditNotes CreditNote[]
  
  @@index([invoiceNumber])
  @@index([status])
  @@index([invoiceDate])
  @@index([dueDate])
  @@index([orderId])
  @@index([vendorId])
  @@index([customerId])
  @@map("invoices")
}

enum InvoiceType {
  SALES // Invoice to customer
  PURCHASE // Invoice from vendor
  PROFORMA // Proforma invoice
  DEBIT_NOTE // Debit note
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

// Invoice line items
model InvoiceLineItem {
  id String @id @default(cuid())
  invoiceId String
  
  itemType String @default("PRODUCT") // PRODUCT, SERVICE, FEE
  productId String?
  
  description String
  quantity Float
  unitPrice Float
  
  discountPercent Float @default(0)
  discountAmount Float @default(0)
  
  taxPercent Float @default(0)
  taxAmount Float @default(0)
  
  lineTotal Float // (quantity * unitPrice) - discount + tax
  
  // COGS tracking
  costPerUnit Float?
  totalCost Float?
  
  createdAt DateTime @default(now())
  
  // Relations
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  @@index([invoiceId])
  @@index([productId])
  @@map("invoice_line_items")
}

// Invoice payments
model InvoicePayment {
  id String @id @default(cuid())
  invoiceId String
  
  amount Float
  paymentDate DateTime @default(now())
  paymentMethod String
  
  transactionId String?
  gatewayRef String?
  
  notes String?
  
  createdAt DateTime @default(now())
  
  // Relations
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  @@index([invoiceId])
  @@index([paymentDate])
  @@map("invoice_payments")
}
```

#### 3.2: Credit Notes (Refunds)
```prisma
// Credit notes for returns/refunds
model CreditNote {
  id String @id @default(cuid())
  creditNoteNumber String @unique // CN-2026-001
  
  invoiceId String
  orderId String?
  
  reason CreditNoteReason
  reasonDescription String?
  
  // Amounts
  subtotal Float
  taxAmount Float @default(0)
  totalAmount Float
  
  refundMethod RefundMethod
  refundStatus RefundStatus @default(PENDING)
  
  refundedAt DateTime?
  refundedBy String?
  refundReference String?
  
  // Approval
  approvedBy String?
  approvedAt DateTime?
  
  notes String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  invoice Invoice @relation(fields: [invoiceId], references: [id])
  lineItems CreditNoteLineItem[]
  
  @@index([creditNoteNumber])
  @@index([invoiceId])
  @@index([orderId])
  @@index([refundStatus])
  @@map("credit_notes")
}

enum CreditNoteReason {
  PRODUCT_RETURN
  DAMAGED_GOODS
  WRONG_ITEM
  QUALITY_ISSUE
  PRICING_ERROR
  CUSTOMER_REQUEST
  ORDER_CANCELLATION
  DUPLICATE_PAYMENT
}

enum RefundMethod {
  ORIGINAL_PAYMENT_METHOD
  BANK_TRANSFER
  STORE_CREDIT
  CASH
}

enum RefundStatus {
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
  CANCELLED
}

model CreditNoteLineItem {
  id String @id @default(cuid())
  creditNoteId String
  
  productId String?
  description String
  quantity Float
  unitPrice Float
  lineTotal Float
  
  // Impact on inventory
  restockQuantity Float @default(0)
  restocked Boolean @default(false)
  
  createdAt DateTime @default(now())
  
  // Relations
  creditNote CreditNote @relation(fields: [creditNoteId], references: [id], onDelete: Cascade)
  
  @@index([creditNoteId])
  @@map("credit_note_line_items")
}
```

#### 3.3: Financial Journals & Ledgers
```prisma
// Double-entry accounting journal
model JournalEntry {
  id String @id @default(cuid())
  journalNumber String @unique // JE-2026-001
  
  entryDate DateTime @default(now())
  entryType JournalEntryType
  
  reference String? // Invoice number, payment ID, etc.
  referenceType String? // INVOICE, PAYMENT, ADJUSTMENT
  
  description String
  
  totalDebit Float
  totalCredit Float // Must equal totalDebit
  
  status JournalStatus @default(DRAFT)
  
  postedBy String?
  postedAt DateTime?
  
  reversedBy String?
  reversedAt DateTime?
  reversalJournalId String? // Link to reversing entry
  
  notes String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  lineItems JournalLineItem[]
  
  @@index([journalNumber])
  @@index([entryDate])
  @@index([status])
  @@index([reference])
  @@map("journal_entries")
}

enum JournalEntryType {
  SALES
  PURCHASE
  PAYMENT
  RECEIPT
  ADJUSTMENT
  EXPENSE
  DEPRECIATION
  OPENING_BALANCE
  CLOSING_BALANCE
}

enum JournalStatus {
  DRAFT
  POSTED
  REVERSED
}

// Journal line items (debits & credits)
model JournalLineItem {
  id String @id @default(cuid())
  journalEntryId String
  
  accountCode String // Chart of accounts code
  accountName String
  
  debit Float @default(0)
  credit Float @default(0)
  
  description String?
  
  // Dimensions for reporting
  vendorId String?
  customerId String?
  productId String?
  categoryId String?
  
  createdAt DateTime @default(now())
  
  // Relations
  journalEntry JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  
  @@index([journalEntryId])
  @@index([accountCode])
  @@map("journal_line_items")
}

// Chart of Accounts
model Account {
  id String @id @default(cuid())
  accountCode String @unique // 1000, 2000, 3000
  accountName String
  accountType AccountType
  parentAccountId String?
  
  description String?
  isActive Boolean @default(true)
  
  // Balance tracking
  currentBalance Float @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([accountCode])
  @@index([accountType])
  @@map("accounts")
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
  COGS
}
```

#### 3.4: Enhanced Cost Tracking
```prisma
// Update OrderItem to track detailed costs
model OrderItem {
  // ... existing fields ...
  
  // ADD detailed cost breakdown
  baseCost Float? // Vendor cost
  shippingCostPerUnit Float @default(0)
  handlingCostPerUnit Float @default(0)
  platformFeePerUnit Float @default(0)
  paymentFeePerUnit Float @default(0)
  taxPerUnit Float @default(0)
  totalCostPerUnit Float? // Sum of all costs
  
  // Profit breakdown
  grossProfitPerUnit Float? // price - baseCost
  netProfitPerUnit Float? // grossProfit - all fees
  totalGrossProfit Float?
  totalNetProfit Float?
}

// Update Product to track purchase costs
model Product {
  // ... existing fields ...
  
  // ADD purchase tracking
  lastPurchasePrice Float?
  lastPurchaseDate DateTime?
  averageCostPrice Float? // Weighted average
  
  // Landed cost (includes shipping, duties, etc.)
  landedCostPerUnit Float?
}
```

---

## 📊 SECTION 4: PRODUCT ANALYTICS & TRACKING

### Current State
- ✅ Rating & reviewCount fields exist in Product
- ❌ **NO view tracking**
- ❌ **NO conversion tracking**
- ❌ **NO click analytics**
- ❌ **NO wishlist analytics**

### Recommended Schema Changes

#### 4.1: Product Views & Engagement
```prisma
// Track product page views
model ProductView {
  id String @id @default(cuid())
  productId String
  
  // User context
  userId String? // Null if anonymous
  sessionId String // Anonymous session tracking
  
  // Request info
  ipAddress String?
  userAgent String?
  referer String? // Where they came from
  
  // Location (if available)
  country String?
  city String?
  
  // Engagement
  viewDuration Int? // Seconds spent on page
  scrollDepth Int? // % of page scrolled
  
  // Context
  source String? // search, category, homepage, direct
  searchQuery String? // If from search
  categoryId String? // If from category
  
  viewedAt DateTime @default(now())
  
  // Relations
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
  @@index([userId])
  @@index([sessionId])
  @@index([viewedAt])
  @@map("product_views")
}

// Update Product model
model Product {
  // ... existing fields ...
  
  // ADD analytics relations
  views ProductView[]
  clickEvents ProductClickEvent[]
  conversions ProductConversion[]
}
```

#### 4.2: Click Events & CTR Tracking
```prisma
// Track clicks on product cards, buttons, etc.
model ProductClickEvent {
  id String @id @default(cuid())
  productId String
  
  userId String?
  sessionId String
  
  clickType ProductClickType
  elementType String? // add_to_cart, buy_now, view_details, etc.
  
  // Context
  pageType String // homepage, search, category, product_detail
  position Int? // Position in list/grid
  
  clickedAt DateTime @default(now())
  
  // Relations
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
  @@index([clickType])
  @@index([clickedAt])
  @@map("product_click_events")
}

enum ProductClickType {
  PRODUCT_CARD_CLICK
  IMAGE_CLICK
  ADD_TO_CART
  BUY_NOW
  ADD_TO_WISHLIST
  SHARE_PRODUCT
  VIEW_DETAILS
  VIEW_GALLERY
}
```

#### 4.3: Conversion Tracking
```prisma
// Track conversion funnel: View → Cart → Checkout → Purchase
model ProductConversion {
  id String @id @default(cuid())
  productId String
  
  userId String?
  sessionId String
  
  // Funnel stages
  viewedAt DateTime?
  addedToCartAt DateTime?
  checkoutStartedAt DateTime?
  purchasedAt DateTime?
  
  // Order reference
  orderId String?
  orderItemId String?
  
  // Revenue
  quantity Int?
  revenue Float?
  profit Float?
  
  // Attribution
  firstTouchSource String? // How they first discovered product
  lastTouchSource String? // Last interaction before purchase
  
  conversionTime Int? // Minutes from view to purchase
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
  @@index([sessionId])
  @@index([orderId])
  @@map("product_conversions")
}
```

#### 4.4: Product Performance Summary
```prisma
// Daily aggregated product analytics
model ProductAnalyticsSummary {
  id String @id @default(cuid())
  productId String
  date DateTime @db.Date
  
  // Views & Engagement
  totalViews Int @default(0)
  uniqueViews Int @default(0)
  avgViewDuration Float @default(0)
  
  // Clicks
  totalClicks Int @default(0)
  addToCartClicks Int @default(0)
  wishlistClicks Int @default(0)
  
  // Conversions
  cartAdds Int @default(0)
  checkoutStarts Int @default(0)
  purchases Int @default(0)
  
  // Revenue
  revenue Float @default(0)
  profit Float @default(0)
  
  // Rates
  viewToCartRate Float @default(0) // %
  cartToCheckoutRate Float @default(0) // %
  checkoutToPurchaseRate Float @default(0) // %
  overallConversionRate Float @default(0) // %
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([productId, date])
  @@index([productId])
  @@index([date])
  @@map("product_analytics_summary")
}

// Update Product model
model Product {
  // ... existing fields ...
  
  // ADD summary relation
  analyticsSummaries ProductAnalyticsSummary[]
}
```

---

## ⭐ SECTION 5: REVIEWS & RATINGS SYSTEM

### Current State
- ✅ `rating` and `reviewCount` fields in Product
- ❌ **NO Review model**
- ❌ **NO moderation workflow**
- ❌ **NO review replies**
- ❌ **NO review images**

### Recommended Schema Changes

#### 5.1: Core Review Model
```prisma
// Customer product reviews
model Review {
  id String @id @default(cuid())
  productId String
  userId String
  
  // Review content
  rating Int @db.SmallInt // 1-5 stars
  title String?
  comment String @db.Text
  
  // Media
  imageUrls String[] @default([]) // Review images
  videoUrl String?
  
  // Verification
  isVerifiedPurchase Boolean @default(false)
  orderId String? // Proof of purchase
  orderItemId String?
  
  // Moderation
  status ReviewStatus @default(PENDING)
  moderatedBy String?
  moderatedAt DateTime?
  moderationReason String?
  
  // Engagement
  helpfulCount Int @default(0)
  notHelpfulCount Int @default(0)
  reportCount Int @default(0)
  
  // Visibility
  isVisible Boolean @default(true)
  isFeatured Boolean @default(false)
  
  // Metadata
  ipAddress String?
  userAgent String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  replies ReviewReply[]
  votes ReviewVote[]
  reports ReviewReport[]
  
  @@index([productId])
  @@index([userId])
  @@index([status])
  @@index([rating])
  @@index([createdAt])
  @@index([isVerifiedPurchase])
  @@map("reviews")
}

enum ReviewStatus {
  PENDING // Awaiting moderation
  APPROVED // Published
  REJECTED // Not published
  FLAGGED // Requires attention
  HIDDEN // Hidden by admin
}

// Update Product model
model Product {
  // ... existing fields ...
  
  // ADD review relation
  reviews Review[]
}

// Update User model
model User {
  // ... existing fields ...
  
  // ADD review relations
  reviews Review[]
  reviewReplies ReviewReply[]
  reviewVotes ReviewVote[]
}
```

#### 5.2: Review Replies (Vendor/Admin Response)
```prisma
// Replies to reviews by vendors or admins
model ReviewReply {
  id String @id @default(cuid())
  reviewId String
  userId String // Vendor or admin
  
  replyType ReviewReplyType
  comment String @db.Text
  
  isOfficial Boolean @default(false) // Official vendor/brand response
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])
  
  @@index([reviewId])
  @@index([userId])
  @@map("review_replies")
}

enum ReviewReplyType {
  VENDOR // From product vendor
  ADMIN // From platform admin
  CUSTOMER // From another customer
}
```

#### 5.3: Review Voting (Helpful/Not Helpful)
```prisma
// Track helpful votes on reviews
model ReviewVote {
  id String @id @default(cuid())
  reviewId String
  userId String
  
  voteType ReviewVoteType // HELPFUL, NOT_HELPFUL
  
  createdAt DateTime @default(now())
  
  // Relations
  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])
  
  @@unique([reviewId, userId])
  @@index([reviewId])
  @@index([userId])
  @@map("review_votes")
}

enum ReviewVoteType {
  HELPFUL
  NOT_HELPFUL
}
```

#### 5.4: Review Reporting & Moderation
```prisma
// Report inappropriate reviews
model ReviewReport {
  id String @id @default(cuid())
  reviewId String
  reportedBy String // userId
  
  reason ReviewReportReason
  description String?
  
  status ReportStatus @default(PENDING)
  
  reviewedBy String?
  reviewedAt DateTime?
  resolution String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  
  @@index([reviewId])
  @@index([reportedBy])
  @@index([status])
  @@map("review_reports")
}

enum ReviewReportReason {
  SPAM
  OFFENSIVE_CONTENT
  FAKE_REVIEW
  COMPETITOR_REVIEW
  PERSONAL_INFORMATION
  OFF_TOPIC
  DUPLICATE
  OTHER
}

enum ReportStatus {
  PENDING
  UNDER_REVIEW
  RESOLVED
  DISMISSED
}
```

#### 5.5: Vendor Reviews (Rate the Vendor)
```prisma
// Separate vendor rating system
model VendorReview {
  id String @id @default(cuid())
  vendorId String
  userId String
  orderId String // Must have purchased from vendor
  
  // Ratings (1-5 each)
  productQualityRating Int @db.SmallInt
  communicationRating Int @db.SmallInt
  shippingSpeedRating Int @db.SmallInt
  packagingRating Int @db.SmallInt
  overallRating Int @db.SmallInt // Average
  
  comment String? @db.Text
  
  status ReviewStatus @default(PENDING)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  
  @@unique([vendorId, userId, orderId])
  @@index([vendorId])
  @@index([userId])
  @@index([status])
  @@map("vendor_reviews")
}
```

---

## 📦 SECTION 6: ORDER EVENT TRACKING

### Current State
- ✅ Order status changes tracked implicitly
- ❌ **NO explicit event log**
- ❌ **NO timeline visualization**
- ❌ **NO notification triggers**

### Recommended Schema Changes

#### 6.1: Order Events Log
```prisma
// Comprehensive order event timeline
model OrderEvent {
  id String @id @default(cuid())
  orderId String
  
  eventType OrderEventType
  status OrderStatus? // New status if status change
  previousStatus OrderStatus? // Old status
  
  // Event details
  title String // "Order Placed", "Payment Confirmed", etc.
  description String?
  
  // User context
  performedBy String? // userId or system
  performedByType String @default("USER") // USER, SYSTEM, WEBHOOK
  
  // Metadata
  metadata Json? // Additional event-specific data
  
  // Location tracking
  location String? // For shipping updates
  latitude Float?
  longitude Float?
  
  // Visibility
  isVisibleToCustomer Boolean @default(true)
  isVisibleToVendor Boolean @default(true)
  
  eventTime DateTime @default(now())
  
  // Relations
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([eventType])
  @@index([eventTime])
  @@map("order_events")
}

enum OrderEventType {
  ORDER_CREATED
  PAYMENT_INITIATED
  PAYMENT_SUCCESS
  PAYMENT_FAILED
  ORDER_CONFIRMED
  VENDOR_NOTIFIED
  PROCESSING_STARTED
  ITEMS_PACKED
  READY_FOR_PICKUP
  SHIPPING_LABEL_CREATED
  HANDED_TO_COURIER
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERY_ATTEMPTED
  DELIVERED
  CANCELLED_BY_CUSTOMER
  CANCELLED_BY_ADMIN
  CANCELLED_BY_VENDOR
  REFUND_REQUESTED
  REFUND_APPROVED
  REFUND_PROCESSED
  RETURN_REQUESTED
  RETURN_APPROVED
  RETURN_RECEIVED
  NOTE_ADDED
  STATUS_UPDATED
}

// Update Order model
model Order {
  // ... existing fields ...
  
  // ADD events relation
  events OrderEvent[]
}
```

---

## 🚀 SECTION 7: MISSING CRITICAL ENTITIES

### 7.1: Shipping Integration
```prisma
// Shipping carriers and tracking
model ShippingCarrier {
  id String @id @default(cuid())
  name String // Pathao, RedX, Steadfast
  code String @unique // PATHAO, REDX
  
  apiEndpoint String?
  apiKey String? // Encrypted
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("shipping_carriers")
}

model ShipmentTracking {
  id String @id @default(cuid())
  orderId String @unique
  
  carrierId String
  trackingNumber String @unique
  
  status ShipmentStatus @default(PENDING)
  
  // Location
  currentLocation String?
  estimatedDelivery DateTime?
  
  // Events
  trackingEvents Json[] @default([])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([trackingNumber])
  @@index([orderId])
  @@map("shipment_tracking")
}

enum ShipmentStatus {
  PENDING
  PICKED_UP
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  FAILED
  RETURNED
}
```

### 7.2: Discount & Coupon System
```prisma
// Promotional coupons
model Coupon {
  id String @id @default(cuid())
  code String @unique // SAVE20, WELCOME10
  
  type CouponType
  value Float // % or fixed amount
  
  // Restrictions
  minOrderValue Float?
  maxDiscount Float?
  usageLimit Int? // Total uses allowed
  usagePerCustomer Int @default(1)
  
  // Applicability
  applicableCategories String[] @default([])
  applicableProducts String[] @default([])
  excludedProducts String[] @default([])
  
  // Validity
  startDate DateTime @default(now())
  endDate DateTime?
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  usages CouponUsage[]
  
  @@index([code])
  @@index([isActive])
  @@map("coupons")
}

enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}

model CouponUsage {
  id String @id @default(cuid())
  couponId String
  userId String
  orderId String
  
  discountAmount Float
  
  usedAt DateTime @default(now())
  
  // Relations
  coupon Coupon @relation(fields: [couponId], references: [id])
  
  @@index([couponId])
  @@index([userId])
  @@map("coupon_usages")
}
```

### 7.3: Notification Templates
```prisma
// Email/SMS templates
model NotificationTemplate {
  id String @id @default(cuid())
  name String
  code String @unique // ORDER_CONFIRMED, PAYMENT_SUCCESS
  
  type NotificationType
  
  subject String?
  bodyTemplate String @db.Text // Supports placeholders {{orderNumber}}
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("notification_templates")
}

enum NotificationType {
  EMAIL
  SMS
  PUSH
  IN_APP
}

model Notification {
  id String @id @default(cuid())
  userId String?
  
  type NotificationType
  channel String // email, sms, push
  
  recipient String // email or phone
  subject String?
  message String @db.Text
  
  status NotificationStatus @default(PENDING)
  
  sentAt DateTime?
  readAt DateTime?
  clickedAt DateTime?
  
  // Reference
  referenceType String? // ORDER, PAYMENT, etc.
  referenceId String?
  
  metadata Json?
  
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([status])
  @@index([type])
  @@map("notifications")
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  READ
}
```

---

## 📊 RECOMMENDED INDEXES SUMMARY

### High-Impact Composite Indexes

```prisma
// Product performance queries
@@index([categoryId, isActive, stockQuantity])
@@index([vendorId, isActive, stockQuantity])
@@index([rating, reviewCount])

// Order analytics
@@index([status, createdAt])
@@index([userId, status, createdAt])
@@index([vendorId, status, createdAt])

// Financial queries
@@index([vendorId, periodStart, periodEnd, status]) // VendorPayout
@@index([date, productId]) // Analytics
@@index([month, year, status]) // Settlements

// Inventory
@@index([warehouseId, availableQuantity]) // Stock availability
@@index([productId, warehouseId, availableQuantity])

// Reviews
@@index([productId, status, rating, createdAt])
@@index([userId, status, createdAt])
```

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1: Critical (2-3 weeks)
1. **Vendor Model** - Replace Partner for true multi-vendor
2. **Vendor Commissions** - Commission tracking per product
3. **Invoice System** - Sales invoices
4. **Credit Notes** - Refund tracking
5. **Product Analytics** - Views, clicks, conversions

### Phase 2: Important (3-4 weeks)
6. **Reviews System** - Complete review/rating implementation
7. **Vendor Payouts** - Payout calculation & distribution
8. **Warehouse Stock** - Multi-warehouse inventory
9. **Order Events** - Event timeline tracking
10. **Shipping Integration** - Carrier tracking

### Phase 3: Enhancement (2-3 weeks)
11. **Journal Entries** - Double-entry accounting
12. **Vendor Reviews** - Rate vendors separately
13. **Coupon System** - Promotional discounts
14. **Notification Templates** - Automated notifications
15. **Stock Transfers** - Inter-warehouse transfers

---

## 🔗 FOREIGN KEY & CASCADE RULES

### Recommended Cascade Behaviors

```prisma
// Protect critical data
Vendor -> Products: onDelete: SetNull (keep products if vendor deleted)
Vendor -> Payouts: onDelete: Restrict (prevent deletion with unpaid payouts)

// Allow cleanup
User -> Reviews: onDelete: Cascade
Product -> Reviews: onDelete: Cascade
Order -> OrderEvents: onDelete: Cascade

// Preserve history
Invoice -> CreditNotes: onDelete: Restrict
Order -> Invoice: onDelete: Restrict

// Archive pattern
Vendor.isActive = false (soft delete, don't cascade)
Product.isActive = false (soft delete, don't cascade)
```

---

## 📈 MIGRATION STRATEGY

### Step 1: Add New Models (No Breaking Changes)
- Add Vendor, VendorCommission, VendorPayout
- Add Invoice, InvoiceLineItem, CreditNote
- Add Review, ReviewReply, ReviewVote
- Add ProductView, ProductClickEvent
- Add OrderEvent
- Add Warehouse relations

### Step 2: Migrate Data
```sql
-- Migrate Partner data to Vendor (if applicable)
-- Migrate existing sellerId to vendorId
-- Backfill analytics from existing orders
-- Create invoices for existing orders
```

### Step 3: Deprecate Old Fields
- Mark `Product.sellerId` as deprecated
- Mark `Partner` as profit-sharing only
- Update all APIs to use new models

### Step 4: Update Relations
- Update Product.seller to Product.vendor
- Update all foreign keys
- Run database migrations

---

## 🎯 EXPECTED BENEFITS

### Business Impact
1. **Vendor Management** - True multi-vendor marketplace capability
2. **Financial Accuracy** - Proper invoicing, credit notes, COGS tracking
3. **Data-Driven Decisions** - Product analytics for optimization
4. **Customer Trust** - Complete review system with moderation
5. **Operational Efficiency** - Automated payouts, settlements
6. **Scalability** - Multi-warehouse support

### Technical Improvements
1. **Data Integrity** - Proper foreign keys & cascades
2. **Query Performance** - Strategic indexes
3. **Audit Trail** - Complete event tracking
4. **Extensibility** - Flexible metadata JSON fields
5. **Compliance** - Financial journal for accounting

---

## 📚 NEXT STEPS

1. **Review & Approve** - Stakeholder review of proposed changes
2. **Create Migrations** - Write Prisma migration files
3. **Update APIs** - Modify backend endpoints
4. **Update UI** - Build admin interfaces
5. **Data Migration** - Backfill existing data
6. **Testing** - Comprehensive testing of new features
7. **Documentation** - Update API & user documentation
8. **Deployment** - Phased rollout to production

---

**Total New Models:** 35+ new models  
**Total New Relations:** 80+ new relations  
**Total New Indexes:** 60+ new indexes  
**Estimated Schema Size:** ~3,500 lines (3x current size)  
**Migration Effort:** 8-12 weeks (3 phases)

