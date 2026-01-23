# Manual Sales Entry System

## Overview

The Manual Sales Entry System allows administrators to record sales that occur outside the online platform - such as offline store sales, phone orders, wholesale direct sales, and external channel transactions. This ensures complete financial tracking and inventory management across all sales channels.

## Features

### 1. **Date-wise Sales Recording**
- Admin can specify any sale date (not limited to current date)
- Useful for recording historical sales or backdated entries
- Helps maintain accurate financial records over time

### 2. **Product Cost Tracking**
- Record the actual cost per unit for each product sold
- Automatically calculates profit per item and total profit
- Calculates profit margins for business analytics
- Supports different cost prices for the same product in different sales

### 3. **Inventory Integration**
- Optional automatic stock adjustment
- When enabled, reduces product inventory quantities
- Creates inventory logs for audit trail
- Can be disabled for sales already reflected in inventory

### 4. **Financial Ledger Integration**
- Automatically creates financial ledger entries
- Records as REVENUE (CREDIT) in the ledger
- Stores profit metadata for financial reporting
- Maintains double-entry bookkeeping principles

### 5. **Customer Management**
- Link to existing registered customers
- Or record guest customer information (name, phone, company)
- Helps track customer purchase history
- Supports both B2B and B2C sales

### 6. **Multi-channel Support**
Sales can be categorized by type:
- **OFFLINE** - In-store/offline retail sales
- **PHONE_ORDER** - Orders received via phone
- **WHOLESALE_DIRECT** - Direct wholesale transactions
- **EXTERNAL_CHANNEL** - Sales through external platforms
- **OTHER** - Any other sales type

### 7. **Payment Tracking**
- Multiple payment methods (Cash, Bank Transfer, Mobile Payment, Card, Cheque, Other)
- Payment status tracking (Paid, Partial, Pending)
- Records amount paid and calculates balance due
- Helps track receivables

### 8. **Comprehensive Calculations**
- **Subtotal**: Sum of all items (quantity × unit price)
- **Discount**: Optional discount amount
- **Tax**: Tax amount
- **Shipping**: Shipping/delivery charges
- **Total**: Final sale amount
- **Total Cost**: Sum of all product costs
- **Total Profit**: Total - Total Cost
- **Profit Margin**: (Profit / Total) × 100

## Database Schema

### ManualSalesEntry
Main table storing sale records.

```prisma
model ManualSalesEntry {
  id              String   @id @default(cuid())
  saleDate        DateTime
  referenceNumber String?  // Invoice/reference number
  saleType        String   // OFFLINE, PHONE_ORDER, etc.
  
  // Customer Information
  customerId      String?  // Link to existing customer
  customerName    String   // Required
  customerEmail   String?
  customerPhone   String?
  customerCompany String?
  
  // Financial Summary
  subtotal        Float
  discount        Float    @default(0)
  tax             Float    @default(0)
  shipping        Float    @default(0)
  total           Float
  totalCost       Float
  totalProfit     Float
  profitMargin    Float
  
  // Payment Details
  paymentMethod   String
  paymentStatus   String
  amountPaid      Float
  
  // Inventory & Audit
  inventoryAdjusted Boolean @default(false)
  notes           String?
  enteredBy       String  // Admin who entered
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  customer        User?               @relation("ManualSalesCustomer")
  items           ManualSalesItem[]
  enteredByUser   User                @relation("SaleEnteredBy")
}
```

### ManualSalesItem
Line items for each sale.

```prisma
model ManualSalesItem {
  id             String   @id @default(cuid())
  saleEntryId    String
  
  // Product Reference
  productId      String
  productName    String   // Snapshot at time of sale
  productSku     String
  
  // Pricing
  quantity       Int
  unitPrice      Float
  costPerUnit    Float
  subtotal       Float
  discount       Float    @default(0)
  total          Float
  totalCost      Float
  profit         Float
  profitMargin   Float
  
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Relations
  saleEntry      ManualSalesEntry @relation(fields: [saleEntryId])
  product        Product          @relation(fields: [productId])
}
```

## API Endpoints

### 1. Create Manual Sale
**POST** `/api/admin/manual-sales`

Creates a new manual sales entry.

**Request Body:**
```json
{
  "saleDate": "2026-01-15",
  "referenceNumber": "INV-2026-001",
  "saleType": "OFFLINE",
  "customerId": "clx123...",  // Optional
  "customerName": "John Doe",
  "customerPhone": "+880 1XXX-XXXXXX",
  "customerCompany": "ABC Trading Ltd.",
  "items": [
    {
      "productId": "clx456...",
      "quantity": 10,
      "unitPrice": 150.00,
      "costPerUnit": 100.00,
      "discount": 0,
      "notes": "Special order"
    }
  ],
  "discount": 50.00,
  "tax": 30.00,
  "shipping": 20.00,
  "paymentMethod": "CASH",
  "paymentStatus": "PAID",
  "amountPaid": 1500.00,
  "adjustInventory": true,
  "notes": "Walk-in customer purchase"
}
```

**Features:**
- Validates all products exist
- Checks stock availability if adjustInventory=true
- Calculates all totals automatically
- Creates financial ledger entry
- Adjusts inventory atomically
- Logs activity for audit

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx789...",
    "saleDate": "2026-01-15T00:00:00.000Z",
    "total": 1500.00,
    "totalProfit": 450.00,
    "profitMargin": 30.00,
    ...
  }
}
```

### 2. List Sales
**GET** `/api/admin/manual-sales`

Retrieves paginated list of manual sales.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `saleType` - Filter by type (OFFLINE, PHONE_ORDER, etc.)
- `startDate` - Filter by date range start
- `endDate` - Filter by date range end
- `customerId` - Filter by customer
- `paymentStatus` - Filter by payment status

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 98,
    "hasMore": true
  }
}
```

### 3. Get Sale Details
**GET** `/api/admin/manual-sales/[id]`

Retrieves detailed information about a specific sale.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx789...",
    "saleDate": "2026-01-15T00:00:00.000Z",
    "referenceNumber": "INV-2026-001",
    "items": [...],
    "customer": {...},
    "enteredBy": {...},
    ...
  }
}
```

### 4. Update Sale
**PUT** `/api/admin/manual-sales/[id]`

Updates limited fields of a sale entry. Financial calculations and items cannot be changed.

**Updatable Fields:**
- saleDate
- referenceNumber
- paymentMethod
- paymentStatus
- amountPaid
- notes

**Request Body:**
```json
{
  "paymentStatus": "PAID",
  "amountPaid": 1500.00,
  "notes": "Updated notes"
}
```

### 5. Delete Sale
**DELETE** `/api/admin/manual-sales/[id]`

Deletes a sale entry (Super Admin only).

**Features:**
- Requires SUPER_ADMIN role
- Restores inventory if it was adjusted
- Deletes associated financial ledger entries
- Transaction-safe operation
- Logs deletion activity

## Admin UI Pages

### 1. Sales List Page
**Path:** `/admin/manual-sales`

**Features:**
- Statistics cards showing:
  - Total Sales Value
  - Total Profit
  - Average Profit Margin
- Filterable table with:
  - Date & Reference
  - Customer details
  - Sale type badge
  - Number of items
  - Total amount
  - Profit & margin
  - Payment status
  - Actions (View, Delete)
- Advanced filters:
  - Sale type
  - Date range
  - Payment status
- Pagination
- Responsive design

### 2. Create Sale Page
**Path:** `/admin/manual-sales/new`

**Sections:**

**A. Sale Information**
- Sale date picker
- Reference/invoice number
- Sale type selector

**B. Customer Information**
- Search existing customers (autocomplete)
- Or enter guest customer details:
  - Name (required)
  - Phone
  - Company

**C. Products**
- Product search (autocomplete)
- Add multiple products
- For each product:
  - Quantity
  - Unit price (editable)
  - Cost per unit (editable)
  - Discount
  - Notes
- Real-time subtotal calculation
- Remove product option

**D. Additional Charges**
- Discount amount
- Tax amount
- Shipping charges

**E. Notes**
- Additional notes about the sale

**F. Payment Details (Sidebar)**
- Payment method selector
- Payment status selector
- Amount paid (for partial payments)

**G. Inventory Adjustment (Sidebar)**
- Checkbox to enable/disable inventory adjustment
- Explanation tooltip

**H. Sale Summary (Sidebar)**
- Live calculations showing:
  - Subtotal
  - Discount (if any)
  - Tax (if any)
  - Shipping (if any)
  - **Total Sale** (highlighted)
  - Total Cost
  - **Profit** (green, highlighted)
  - **Profit Margin %** (green, highlighted)

**I. Submit Button**
- Validates all required fields
- Shows loading state
- Displays success/error messages
- Redirects to sales list on success

### 3. Sale Detail Page
**Path:** `/admin/manual-sales/[id]`

**Sections:**

**A. Sale Information**
- Sale date
- Sale type
- Created at timestamp
- Entered by admin name
- Inventory adjustment status

**B. Customer Information**
- Name
- Email (if available)
- Phone (if available)
- Company (if available)

**C. Items Sold**
- Product image
- Product name & SKU
- Quantity, unit price, cost per unit
- Total per item
- Profit per item
- Margin per item
- Notes per item

**D. Payment Details (Sidebar)**
- Payment method
- Payment status badge
- Amount paid
- Balance due (if any)

**E. Financial Summary (Sidebar)**
- All calculations displayed
- Highlighted profit and margin

**F. Quick Stats (Sidebar)**
- Total items count
- Total units sold
- Average profit per item

**G. Actions**
- Delete button (Super Admin only)
- Back to list link

## Usage Examples

### Example 1: Recording an Offline Store Sale

1. Navigate to `/admin/manual-sales/new`
2. Select today's date
3. Choose "Offline Store" as sale type
4. Enter customer name or search for existing customer
5. Search and add products:
   - Product A: 5 units @ ৳200/unit (cost: ৳150/unit)
   - Product B: 3 units @ ৳300/unit (cost: ৳220/unit)
6. Add any discount, tax, shipping
7. Select payment method: "Cash"
8. Select payment status: "Paid"
9. Enable "Adjust Inventory" checkbox
10. Add notes if needed
11. Review the calculated profit in sidebar
12. Click "Record Sale"

**Result:**
- Sale recorded in database
- Inventory reduced for both products
- Financial ledger entry created
- Profit of ৳490 recorded ((5×50) + (3×80))
- Activity logged

### Example 2: Recording a Phone Order (Partial Payment)

1. Navigate to `/admin/manual-sales/new`
2. Select sale date
3. Choose "Phone Order" as sale type
4. Enter customer details (new customer)
5. Add ordered products
6. Calculate total: ৳5000
7. Select payment method: "Bank Transfer"
8. Select payment status: "Partial"
9. Enter amount paid: ৳3000
10. Enable inventory adjustment
11. Add notes: "Balance ৳2000 to be paid on delivery"
12. Click "Record Sale"

**Result:**
- Sale recorded with ৳2000 balance
- Inventory adjusted
- Payment status tracked as "Partial"
- Follow-up required for remaining ৳2000

### Example 3: Viewing Sales Report

1. Navigate to `/admin/manual-sales`
2. View statistics:
   - Total sales this period
   - Total profit earned
   - Average margin
3. Apply filters:
   - Date range: Last 30 days
   - Sale type: All
   - Payment status: Paid
4. Review the table
5. Click "View" on any sale to see details
6. Analyze profit margins per sale

## Business Benefits

### 1. **Complete Financial Picture**
- Tracks all revenue sources, not just online orders
- Accurate profit calculation across all channels
- Better financial reporting and analytics

### 2. **Inventory Accuracy**
- All sales (online and offline) adjust inventory
- Prevents stock discrepancies
- Real-time stock visibility

### 3. **Customer Insights**
- Track customer purchases across all channels
- Build comprehensive customer profiles
- Better customer relationship management

### 4. **Profit Optimization**
- Understand profit margins per channel
- Identify most profitable products
- Make data-driven pricing decisions

### 5. **Audit Trail**
- Complete record of who entered each sale
- Timestamp tracking
- Activity logs for accountability

### 6. **Operational Efficiency**
- Quick entry for walk-in customers
- Batch entry for phone orders
- Flexible date selection for delayed entries

## Integration Points

### 1. Inventory Management
- Uses existing Product model
- Integrates with stock tracking
- Creates InventoryLog entries
- Respects stock availability

### 2. Financial System
- Creates FinancialLedger entries
- Category: REVENUE
- Type: CREDIT
- Stores profit metadata

### 3. User System
- Links to existing customers
- Tracks admin who entered sale
- Respects role permissions (ADMIN, SUPER_ADMIN)

### 4. Activity Logging
- Logs all CRUD operations
- Records who, what, when
- Searchable audit trail

## Security & Permissions

### Required Roles
- **Create/List/View**: ADMIN or SUPER_ADMIN
- **Update**: ADMIN or SUPER_ADMIN
- **Delete**: SUPER_ADMIN only

### Authentication
- JWT token required in Authorization header
- Token validated on every request
- User role extracted from token

### Data Validation
- All required fields validated
- Product existence checked
- Stock availability verified
- Numeric values validated (positive amounts)
- Date formats validated

### Transaction Safety
All database operations use Prisma transactions to ensure:
- Atomic operations (all or nothing)
- Data consistency
- No partial updates
- Inventory restoration on delete

## Best Practices

### 1. Recording Sales
- Enter sales promptly to maintain accuracy
- Use reference numbers for easy tracking
- Add detailed notes for special circumstances
- Enable inventory adjustment for physical sales

### 2. Customer Information
- Link to existing customers when possible
- Record phone numbers for follow-up
- Note company names for B2B sales

### 3. Pricing
- Double-check cost per unit
- Update prices if they differ from defaults
- Document reasons for discounts

### 4. Payment Tracking
- Record partial payments immediately
- Follow up on pending payments
- Use consistent payment methods

### 5. Reconciliation
- Regularly review sales reports
- Compare with cash register totals
- Reconcile with bank deposits
- Verify inventory levels match records

## Troubleshooting

### Issue: Product not found when adding
**Solution:** Ensure product exists and is active. Search by exact name or SKU.

### Issue: Inventory adjustment failed
**Solution:** Check if sufficient stock is available. Verify product stockQuantity > quantity sold.

### Issue: Delete permission denied
**Solution:** Only SUPER_ADMIN can delete sales. Regular admins cannot delete.

### Issue: Financial totals don't match
**Solution:** Verify all item prices and quantities. Check discount, tax, shipping calculations.

### Issue: Customer not found in search
**Solution:** Ensure customer is registered with role BUYER. Or enter as guest customer.

## Future Enhancements

### Potential Features
1. **Bulk Import**: CSV import for multiple sales entries
2. **Receipt Generation**: PDF invoice/receipt generation
3. **SMS Notifications**: Send receipt via SMS to customer
4. **Payment Links**: Generate payment links for pending balances
5. **Sales Analytics Dashboard**: Advanced charts and reports
6. **Product Suggestions**: ML-based product recommendations
7. **Barcode Scanning**: Quick product entry via barcode
8. **Multi-currency**: Support for international sales
9. **Return Management**: Handle returns and refunds
10. **Commission Tracking**: Track sales person commissions

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS
- **Notifications**: React Toastify
- **Authentication**: JWT

### File Structure
```
src/
  app/
    api/
      admin/
        manual-sales/
          route.ts          # List & Create
          [id]/
            route.ts        # Get, Update, Delete
    admin/
      manual-sales/
        page.tsx            # Sales List
        new/
          page.tsx          # Create Sale
        [id]/
          page.tsx          # View Sale Details
          
prisma/
  schema.prisma             # ManualSalesEntry & ManualSalesItem models
  migrations/
    20260123115845_add_manual_sales_system/
      migration.sql
      
docs/
  MANUAL_SALES_SYSTEM.md    # This documentation
```

### Performance Considerations
- Indexed fields: saleDate, customerId, enteredBy, saleType
- Pagination (20 items per page default)
- Relation loading optimized with `include`
- Transaction-based operations for consistency
- Real-time calculations on frontend (no extra API calls)

## Conclusion

The Manual Sales Entry System provides a comprehensive solution for tracking all sales channels in one platform. By recording offline sales, phone orders, and external transactions, businesses gain complete visibility into their revenue, inventory, and profitability across all channels.

The system is designed for ease of use, with intuitive UI, automatic calculations, and robust validation to ensure data accuracy and consistency.

---

**Version:** 1.0.0  
**Last Updated:** January 23, 2026  
**Author:** Skyzone Development Team
