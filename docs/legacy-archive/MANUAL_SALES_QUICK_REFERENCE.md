# Manual Sales Quick Reference

## Quick Access

- **Sales List**: `/admin/manual-sales`
- **New Sale**: `/admin/manual-sales/new`
- **View Sale**: `/admin/manual-sales/[id]`

## API Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/admin/manual-sales` | List sales | ADMIN |
| POST | `/api/admin/manual-sales` | Create sale | ADMIN |
| GET | `/api/admin/manual-sales/[id]` | Get details | ADMIN |
| PUT | `/api/admin/manual-sales/[id]` | Update sale | ADMIN |
| DELETE | `/api/admin/manual-sales/[id]` | Delete sale | SUPER_ADMIN |

## Sale Types

| Type | Description | Use Case |
|------|-------------|----------|
| `OFFLINE` | Offline Store | Walk-in customers, physical store sales |
| `PHONE_ORDER` | Phone Order | Orders received via phone call |
| `WHOLESALE_DIRECT` | Wholesale Direct | Direct B2B wholesale transactions |
| `EXTERNAL_CHANNEL` | External Channel | Sales via Facebook, WhatsApp, etc. |
| `OTHER` | Other | Any other type of sale |

## Payment Methods

- `CASH` - Cash payment
- `BANK_TRANSFER` - Bank transfer
- `MOBILE_PAYMENT` - bKash, Nagad, Rocket, etc.
- `CARD` - Credit/Debit card
- `CHEQUE` - Cheque payment
- `OTHER` - Other methods

## Payment Status

- `PAID` - Fully paid
- `PARTIAL` - Partially paid (balance due)
- `PENDING` - Payment pending

## Required Fields

### For Sale Entry
- ✅ Sale Date
- ✅ Sale Type
- ✅ Customer Name
- ✅ At least 1 product
- ✅ Payment Method
- ✅ Payment Status

### For Each Product
- ✅ Quantity (> 0)
- ✅ Unit Price (> 0)
- ✅ Cost Per Unit (≥ 0)

## Automatic Calculations

| Field | Formula |
|-------|---------|
| Item Subtotal | `quantity × unitPrice` |
| Item Total | `subtotal - discount` |
| Item Cost | `quantity × costPerUnit` |
| Item Profit | `total - totalCost` |
| Item Margin | `(profit / total) × 100` |
| Sale Subtotal | `Sum of all item subtotals` |
| Sale Total | `subtotal - discount + tax + shipping` |
| Sale Cost | `Sum of all item costs` |
| Sale Profit | `total - totalCost` |
| Sale Margin | `(profit / total) × 100` |

## Database Models

### ManualSalesEntry
```typescript
{
  id: string
  saleDate: Date
  referenceNumber?: string
  saleType: string
  customerId?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerCompany?: string
  subtotal: number
  discount: number
  tax: number
  shipping: number
  total: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  paymentMethod: string
  paymentStatus: string
  amountPaid: number
  inventoryAdjusted: boolean
  notes?: string
  enteredBy: string
  items: ManualSalesItem[]
}
```

### ManualSalesItem
```typescript
{
  id: string
  saleEntryId: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  costPerUnit: number
  subtotal: number
  discount: number
  total: number
  totalCost: number
  profit: number
  profitMargin: number
  notes?: string
}
```

## Common Operations

### Create a Sale (TypeScript)
```typescript
const response = await fetch('/api/admin/manual-sales', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    saleDate: '2026-01-15',
    saleType: 'OFFLINE',
    customerName: 'John Doe',
    items: [
      {
        productId: 'clx123',
        quantity: 5,
        unitPrice: 200,
        costPerUnit: 150,
        discount: 0,
        notes: ''
      }
    ],
    discount: 0,
    tax: 0,
    shipping: 0,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    adjustInventory: true,
    notes: 'Walk-in customer'
  })
});
```

### List Sales with Filters
```typescript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  saleType: 'OFFLINE',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  paymentStatus: 'PAID'
});

const response = await fetch(`/api/admin/manual-sales?${params}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Get Sale Details
```typescript
const response = await fetch(`/api/admin/manual-sales/${saleId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Update Payment Status
```typescript
const response = await fetch(`/api/admin/manual-sales/${saleId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    paymentStatus: 'PAID',
    amountPaid: 5000
  })
});
```

### Delete Sale (Super Admin Only)
```typescript
const response = await fetch(`/api/admin/manual-sales/${saleId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Validation Rules

### Products
- ✅ Product must exist in database
- ✅ Product must be active
- ✅ Sufficient stock if inventory adjustment enabled
- ✅ Quantity > 0
- ✅ Unit price > 0
- ✅ Cost per unit ≥ 0

### Financial
- ✅ Subtotal ≥ 0
- ✅ Discount ≥ 0
- ✅ Tax ≥ 0
- ✅ Shipping ≥ 0
- ✅ Total > 0
- ✅ Amount paid ≤ total (if PAID)
- ✅ Amount paid < total (if PARTIAL)

### Customer
- ✅ Either customerId OR customerName required
- ✅ If customerId provided, customer must exist
- ❌ Email format validated if provided
- ❌ Phone format validated if provided

## Integration Details

### Inventory Management
When `adjustInventory = true`:
1. Validates stock availability for each product
2. Decreases `product.stockQuantity` by sale quantity
3. Creates `InventoryLog` entry per product
4. All in atomic transaction (rollback if any fails)

When `adjustInventory = false`:
- No stock changes
- Use when inventory already adjusted or external tracking

### Financial Ledger
Automatically creates entry:
```typescript
{
  type: 'CREDIT',
  category: 'REVENUE',
  amount: total,
  description: `Manual Sale - ${referenceNumber || saleDate}`,
  metadata: {
    saleId: string,
    profit: number,
    profitMargin: number,
    saleType: string
  }
}
```

### Activity Logging
Logs all operations:
- Create: "Created manual sale entry"
- Update: "Updated manual sale entry"
- Delete: "Deleted manual sale entry"

Includes:
- Admin user ID and name
- Timestamp
- Sale ID and reference
- Action details

## UI Components

### Sales List Features
- ✅ Statistics cards (total sales, profit, margin)
- ✅ Filterable table
- ✅ Pagination (20 per page)
- ✅ Sale type badges
- ✅ Payment status badges
- ✅ Quick view/delete actions
- ✅ Responsive design

### Create Sale Features
- ✅ Date picker
- ✅ Customer search autocomplete
- ✅ Product search autocomplete
- ✅ Multi-product support
- ✅ Real-time calculation display
- ✅ Editable prices and costs
- ✅ Payment method selector
- ✅ Inventory adjustment toggle
- ✅ Validation with error messages
- ✅ Loading states

### View Sale Features
- ✅ Complete sale information
- ✅ Customer details
- ✅ Item list with images
- ✅ Payment summary
- ✅ Financial breakdown
- ✅ Quick stats
- ✅ Delete action (Super Admin)

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No products provided" | Empty items array | Add at least 1 product |
| "Product not found" | Invalid productId | Verify product exists |
| "Insufficient stock" | stockQuantity < quantity | Reduce quantity or disable inventory adjustment |
| "Invalid payment amount" | amountPaid > total | Correct the amount |
| "Unauthorized" | Missing/invalid token | Login again |
| "Forbidden" | Insufficient permissions | Check user role (ADMIN required) |

### Transaction Failures
All operations are atomic. If any step fails:
- ❌ Sale entry NOT created
- ❌ Inventory NOT adjusted
- ❌ Financial ledger NOT updated
- ❌ No partial data saved
- ✅ Error message returned
- ✅ User can retry

## Performance Tips

### Frontend
- Use debounced search for products/customers (300ms)
- Limit search results to 10 items
- Calculate totals on client side (no API calls)
- Show loading states for better UX

### Backend
- Indexed fields for fast queries
- Pagination to limit data transfer
- Include only necessary relations
- Use transactions for data consistency
- Validate early to fail fast

## Security Checklist

✅ JWT authentication required  
✅ Role-based authorization (ADMIN/SUPER_ADMIN)  
✅ Input validation on all fields  
✅ SQL injection prevention (Prisma ORM)  
✅ XSS prevention (React escaping)  
✅ CSRF protection (SameSite cookies)  
✅ Activity logging for audit  
✅ Transaction safety for data integrity  
✅ Super Admin-only delete  

## Monitoring & Analytics

### Key Metrics to Track
1. **Sales Volume**: Total number of manual sales per period
2. **Revenue**: Total sales value
3. **Profit**: Total profit earned
4. **Average Margin**: Average profit margin %
5. **Channel Distribution**: Sales by type (offline, phone, etc.)
6. **Payment Status**: Paid vs Partial vs Pending
7. **Top Products**: Most sold products in manual sales
8. **Top Customers**: Highest value customers

### Queries for Reports

**Total sales today:**
```sql
SELECT COUNT(*), SUM(total), SUM(totalProfit)
FROM ManualSalesEntry
WHERE DATE(saleDate) = CURRENT_DATE;
```

**Sales by type (last 30 days):**
```sql
SELECT saleType, COUNT(*), SUM(total), SUM(totalProfit)
FROM ManualSalesEntry
WHERE saleDate >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY saleType;
```

**Pending payments:**
```sql
SELECT id, customerName, total, amountPaid, (total - amountPaid) as balance
FROM ManualSalesEntry
WHERE paymentStatus IN ('PARTIAL', 'PENDING')
ORDER BY saleDate DESC;
```

## Support & Contact

For technical issues or questions:
- Check full documentation: `MANUAL_SALES_SYSTEM.md`
- Review API responses for error details
- Check browser console for frontend errors
- Verify database connection and migrations
- Contact: Skyzone Development Team

---

**Quick Reference Version:** 1.0.0  
**Last Updated:** January 23, 2026
