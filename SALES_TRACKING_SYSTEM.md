# Sales Tracking System - Complete Documentation

## Overview

A comprehensive sales tracking system that records both **Direct Sales** (manually entered by admin) and **Order-Based Sales** (automatically generated from delivered orders). This system provides complete visibility into revenue, profit margins, and sales performance.

---

## Key Features

### 1. **Dual Sales Tracking**

#### Direct Sales
- Admin manually enters sales that occur outside the platform
- Useful for:
  - Walk-in customers
  - Phone orders
  - Cash sales
  - External transactions

#### Order-Based Sales
- Automatically generated when orders are marked as "delivered"
- Links to original order for complete audit trail
- Captures profit calculations

### 2. **Comprehensive Data Capture**

Each sale records:
- **Customer Information**: Name, phone, email, customer ID
- **Product Details**: ID, name, SKU, quantity, unit price
- **Financial Data**: Total amount, cost price, profit, profit margin
- **Payment Info**: Method, status (Paid/Pending/Partial/Refunded)
- **Metadata**: Sale date, invoice number, notes, entered by user

### 3. **Automatic Inventory Management**

- Stock automatically reduced when direct sale is entered
- Inventory logs created for audit trail
- Prevents overselling with stock validation

### 4. **Profit Tracking**

- Calculates profit per sale: (Unit Price - Cost Price) × Quantity
- Profit margin percentage: (Profit / Total Amount) × 100
- Aggregates profit across all sales

---

## Database Schema

### Sale Model

```prisma
model Sale {
  id              String       @id @default(cuid())
  saleType        SaleType     // DIRECT or ORDER_BASED
  saleDate        DateTime     @default(now())
  
  // Reference
  orderId         String?
  invoiceNumber   String?
  
  // Customer Information
  customerName    String
  customerPhone   String?
  customerEmail   String?
  customerId      String?
  
  // Product Details
  productId       String
  productName     String
  productSku      String?
  quantity        Int
  unitPrice       Float
  totalAmount     Float
  
  // Cost & Profit
  costPrice       Float?
  profitAmount    Float?
  profitMargin    Float?
  
  // Payment Information
  paymentMethod   String?
  paymentStatus   PaymentStatus @default(PAID)
  
  // Additional Information
  notes           String?
  enteredBy       String?
  isDelivered     Boolean      @default(true)
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@map("sales")
}

enum SaleType {
  DIRECT       // Direct sale entered manually by admin
  ORDER_BASED  // Sale generated from delivered order
}
```

---

## API Endpoints

### 1. Get All Sales

**Endpoint**: `GET /api/admin/sales`

**Query Parameters**:
- `saleType`: DIRECT | ORDER_BASED
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `productId`: Product ID
- `customerId`: Customer ID
- `paymentStatus`: PAID | PENDING | PARTIAL | REFUNDED
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50)

**Response**:
```json
{
  "success": true,
  "data": {
    "sales": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 50,
      "totalPages": 3
    },
    "stats": {
      "totalSales": 150,
      "totalRevenue": 500000,
      "totalProfit": 75000,
      "totalQuantity": 1250,
      "byType": [
        {
          "saleType": "DIRECT",
          "_count": { "id": 50 },
          "_sum": { "totalAmount": 200000, "quantity": 400 }
        },
        {
          "saleType": "ORDER_BASED",
          "_count": { "id": 100 },
          "_sum": { "totalAmount": 300000, "quantity": 850 }
        }
      ]
    }
  }
}
```

### 2. Create Direct Sale

**Endpoint**: `POST /api/admin/sales`

**Request Body**:
```json
{
  "productId": "prod123",
  "quantity": 10,
  "unitPrice": 500,
  "customerName": "Ahmed Khan",
  "customerPhone": "01712345678",
  "customerEmail": "ahmed@example.com",
  "customerId": "user456",
  "paymentMethod": "Cash",
  "paymentStatus": "PAID",
  "notes": "Walk-in customer",
  "saleDate": "2026-01-05"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "sale": {
      "id": "sale789",
      "saleType": "DIRECT",
      "totalAmount": 5000,
      "profitAmount": 1000,
      "profitMargin": 20,
      ...
    }
  }
}
```

**Automatic Actions**:
1. Validates stock availability
2. Reduces product stock by quantity
3. Creates inventory log
4. Calculates profit if cost price available
5. Logs activity

### 3. Generate Sales from Delivered Order

**Endpoint**: `POST /api/admin/sales/generate`

**Request Body**:
```json
{
  "orderId": "order123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Generated 3 sale records from order",
  "data": {
    "salesCount": 3,
    "orderId": "order123",
    "orderNumber": "ORD-2026-001"
  }
}
```

**Validation**:
- Order must be in "delivered" status
- Sales don't already exist for this order

### 4. Get Sales Statistics

**Endpoint**: `GET /api/admin/sales/generate`

**Query Parameters**:
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD

**Response**:
```json
{
  "success": true,
  "data": {
    "deliveredOrdersWithoutSales": {
      "count": 5,
      "orders": [...]
    },
    "statistics": {
      "totalSales": 150,
      "directSales": 50,
      "orderBasedSales": 100,
      "totalRevenue": 500000,
      "totalProfit": 75000,
      "totalQuantitySold": 1250
    }
  }
}
```

---

## Admin UI Features

### Sales Management Page

**Location**: `/admin/sales`

#### Dashboard Statistics

Displays 4 key metrics:
1. **Total Sales**: Count of all sales
2. **Total Revenue**: Sum of all sales amounts
3. **Total Profit**: Sum of all profit amounts
4. **Units Sold**: Total quantity sold

#### Delivered Orders Alert

- Shows orders marked as "delivered" but without sales records
- Yellow alert box at top of page
- One-click "Generate Sales" button for each order

#### Tabs & Filters

**Tabs**:
- All Sales
- Direct Sales
- Order-Based Sales

**Filters**:
- Date range (start and end date)
- Clear filters button

#### Sales Table

Displays:
- Date of sale
- Sale type badge (Direct/Order)
- Customer name and phone
- Product name and SKU
- Quantity sold
- Total amount
- Profit amount and margin %
- Payment status and method
- Link to original order (for order-based sales)

#### Add Direct Sale Button

Opens modal for entering new direct sale.

---

## Workflow Examples

### Scenario 1: Walk-in Customer Purchase

1. Admin clicks **"+ Add Direct Sale"**
2. Selects product from dropdown
3. Enters:
   - Quantity: 10
   - Unit Price: ৳500
   - Customer Name: "Ahmed Khan"
   - Customer Phone: "01712345678"
   - Payment Method: "Cash"
4. Clicks **"Save Sale"**
5. System:
   - Validates stock (must have ≥10 units)
   - Creates sale record
   - Reduces stock by 10
   - Logs inventory change
   - Calculates profit if cost price exists

### Scenario 2: Order Completion

1. Order status changes to "delivered"
2. Admin goes to Sales Management page
3. Sees alert: "1 Delivered Orders Without Sales"
4. Clicks **"Generate Sales"** for that order
5. System:
   - Creates sale record for each order item
   - Links sales to order
   - Captures profit calculations
   - Records in activity log

### Scenario 3: Monthly Sales Report

1. Admin goes to Sales Management
2. Sets date range: Jan 1 - Jan 31
3. Selects "All Sales" tab
4. Views statistics:
   - Total Sales: 150
   - Revenue: ৳500,000
   - Profit: ৳75,000
   - Profit Margin: 15%
5. Can export or analyze by sale type

---

## Automatic Sales Generation

### Auto-Generate on Order Delivery

**Function**: `autoGenerateSalesFromOrder(orderId, performedBy)`

**File**: `src/utils/salesGeneration.ts`

**Usage**:
```typescript
import { autoGenerateSalesFromOrder } from '@/utils/salesGeneration';

// When order status changes to 'delivered'
const result = await autoGenerateSalesFromOrder(orderId, adminUserId);

if (result.success) {
  console.log(`Generated ${result.salesCount} sales records`);
}
```

**Features**:
- Checks if order is delivered
- Prevents duplicate sales
- Creates sales for all order items
- Calculates profit from cost and selling price
- Links sales to order

### Batch Generation

**Function**: `batchGenerateSalesFromDeliveredOrders()`

**Usage**:
```typescript
import { batchGenerateSalesFromDeliveredOrders } from '@/utils/salesGeneration';

// Generate sales for all delivered orders without sales
const result = await batchGenerateSalesFromDeliveredOrders();

console.log(`Processed ${result.successCount} orders`);
```

---

## Inventory Integration

### Stock Validation

Before creating a direct sale:
```typescript
// Check stock
if (product.stockQuantity < quantity) {
  return error('Insufficient stock');
}
```

### Stock Reduction

When sale is created:
```typescript
await prisma.product.update({
  where: { id: productId },
  data: {
    stockQuantity: {
      decrement: quantity
    }
  }
});
```

### Inventory Logging

Every sale creates an inventory log:
```typescript
await prisma.inventoryLog.create({
  data: {
    productId,
    action: 'SALE',
    quantity: -quantity,
    previousStock: oldStock,
    newStock: newStock,
    reference: `DIRECT-${saleId}`,
    notes: `Direct sale to ${customerName}`,
    performedBy: adminUserId
  }
});
```

---

## Profit Calculation

### Formula

```typescript
// Per Unit
const profitPerUnit = unitPrice - costPrice;

// Total Profit
const profitAmount = profitPerUnit × quantity;

// Profit Margin
const profitMargin = (profitAmount / totalAmount) × 100;
```

### Example

```
Unit Price: ৳500
Cost Price: ৳400
Quantity: 10

Profit Per Unit: ৳500 - ৳400 = ৳100
Total Profit: ৳100 × 10 = ৳1,000
Total Amount: ৳500 × 10 = ৳5,000
Profit Margin: (৳1,000 / ৳5,000) × 100 = 20%
```

---

## Reports & Analytics

### Available Metrics

1. **Total Sales Count**: Number of transactions
2. **Revenue**: Total sales amount
3. **Profit**: Total profit amount
4. **Average Order Value**: Revenue / Sales Count
5. **Profit Margin**: (Profit / Revenue) × 100
6. **Units Sold**: Total quantity across all sales
7. **Sales by Type**: Direct vs Order-Based breakdown
8. **Sales by Date**: Daily/Weekly/Monthly trends
9. **Top Products**: Best selling products
10. **Top Customers**: Highest revenue customers

### Queries for Reports

**Daily Sales**:
```typescript
const dailySales = await prisma.sale.groupBy({
  by: ['saleDate'],
  where: {
    saleDate: {
      gte: startDate,
      lte: endDate
    }
  },
  _sum: {
    totalAmount: true,
    profitAmount: true,
    quantity: true
  },
  _count: {
    id: true
  }
});
```

**Top Products**:
```typescript
const topProducts = await prisma.sale.groupBy({
  by: ['productId'],
  where: dateFilter,
  _sum: {
    quantity: true,
    totalAmount: true
  },
  orderBy: {
    _sum: {
      totalAmount: 'desc'
    }
  },
  take: 10
});
```

---

## Activity Logging

All sales operations are logged:

**Direct Sale Created**:
```json
{
  "action": "CREATE",
  "entityType": "SALE",
  "entityId": "sale789",
  "userId": "admin123",
  "metadata": {
    "saleType": "DIRECT",
    "productName": "Product ABC",
    "customerName": "Ahmed Khan",
    "quantity": 10,
    "totalAmount": 5000
  }
}
```

**Sales Generated from Order**:
```json
{
  "action": "CREATE",
  "entityType": "SALE",
  "entityId": "order123",
  "userId": "admin123",
  "metadata": {
    "action": "generate_sales_from_order",
    "orderNumber": "ORD-2026-001",
    "itemCount": 3,
    "totalRevenue": 15000
  }
}
```

---

## Testing Checklist

### Direct Sales
- [ ] Create direct sale with valid data
- [ ] Validate stock availability before sale
- [ ] Stock reduced correctly after sale
- [ ] Inventory log created
- [ ] Profit calculated correctly
- [ ] Activity log recorded
- [ ] Error handling for insufficient stock
- [ ] Error handling for missing fields

### Order-Based Sales
- [ ] Generate sales from delivered order
- [ ] Prevent duplicate sales generation
- [ ] Sales linked to order correctly
- [ ] All order items included
- [ ] Profit calculated from order items
- [ ] Only delivered orders can generate sales
- [ ] Batch generation works for multiple orders

### UI Features
- [ ] Statistics display correctly
- [ ] Sales table shows all fields
- [ ] Filters work (tabs and date range)
- [ ] Delivered orders alert appears
- [ ] Generate sales button works
- [ ] Sale type badges display correctly
- [ ] Payment status badges display correctly
- [ ] Pagination works

---

## Future Enhancements

1. **Sales Returns**: Handle product returns and refunds
2. **Batch Sales Entry**: Import sales from CSV
3. **Sales Invoicing**: Generate printable invoices
4. **SMS Notifications**: Send receipt via SMS to customer
5. **Email Receipts**: Automated email confirmations
6. **Payment Plans**: Installment payments
7. **Commission Tracking**: Sales person commissions
8. **Advanced Analytics**: Charts, graphs, trends
9. **Export Reports**: PDF/Excel reports
10. **Sales Forecasting**: Predict future sales

---

## Security & Permissions

### Admin Only Access

All sales endpoints require admin authentication:
```typescript
const adminCheck = await verifyAdmin(request);
if (!adminCheck.isValid) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### Activity Logging

All actions logged with:
- User ID
- Timestamp
- IP address
- Action details

---

## Database Indexes

For optimal performance, the Sales model has indexes on:
- `saleType`: Fast filtering by sale type
- `saleDate`: Quick date range queries
- `orderId`: Efficient order lookup
- `customerId`: Customer sales history
- `productId`: Product sales history
- `paymentStatus`: Payment filtering

---

## Conclusion

The Sales Tracking System provides comprehensive visibility into all revenue-generating activities, whether they occur through the platform (orders) or externally (direct sales). With automatic inventory management, profit tracking, and detailed reporting, administrators have complete control and insight into sales performance.

**Status**: ✅ Fully Implemented

**Files Created**:
- Database: `prisma/schema.prisma` (Sale model)
- API: `/api/admin/sales/route.ts`
- API: `/api/admin/sales/generate/route.ts`
- Utils: `src/utils/salesGeneration.ts`
- UI: `/admin/sales/page.tsx`
- Docs: `SALES_TRACKING_SYSTEM.md`

**Next Steps**:
1. Test all functionalities
2. Generate sales for existing delivered orders
3. Train admins on direct sales entry
4. Monitor sales data and reports
