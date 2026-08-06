# Customer Discount System

## Overview

This document describes the simple, account-level discount system that allows administrators to provide special discounts to specific customers. Unlike per-product custom pricing, this system applies a percentage discount across ALL products for special customers.

## Key Features

- **Account-Level Discount**: One percentage discount applies to all products for a customer
- **Standard Pricing Base**: All products have standard wholesale prices
- **Special Customer Offers**: Select customers receive percentage discounts (e.g., 10% off, 15% off)
- **Optional Expiration**: Discounts can be permanent or have expiration dates
- **Automatic Application**: Discounts are automatically applied during checkout
- **Activity Logging**: All discount changes are logged for audit purposes

## Database Schema

### User Model Fields

```prisma
model User {
  // ... other fields
  discountPercent   Float?    // Percentage discount (0-100)
  discountReason    String?   // Reason for discount (e.g., "VIP Customer", "Loyalty Reward")
  discountValidUntil DateTime? // Optional expiration date
}
```

### Example Data

```json
{
  "id": "user123",
  "name": "Ahmed Khan",
  "discountPercent": 15,
  "discountReason": "VIP Customer",
  "discountValidUntil": "2024-12-31T23:59:59.999Z"
}
```

## API Endpoints

### 1. Set/Update Customer Discount

**Endpoint**: `PATCH /api/admin/customers/[id]/discount`

**Auth Required**: Yes (Admin only)

**Request Body**:
```json
{
  "discountPercent": 15,
  "discountReason": "VIP Customer",
  "discountValidUntil": "2024-12-31"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Discount updated successfully",
  "data": {
    "discountPercent": 15,
    "discountReason": "VIP Customer",
    "discountValidUntil": "2024-12-31T23:59:59.999Z"
  }
}
```

**Validation Rules**:
- `discountPercent`: Required, must be 0-100
- `discountReason`: Optional string
- `discountValidUntil`: Optional ISO date string (future dates only)

### 2. Remove Customer Discount

**Endpoint**: `PATCH /api/admin/customers/[id]/discount`

**Request Body**:
```json
{
  "discountPercent": 0,
  "discountReason": null,
  "discountValidUntil": null
}
```

## Admin UI - User Management

### Discount Column

The user management table displays discount information:

**Desktop View**:
- Dedicated "Discount" column showing:
  - Discount percentage (e.g., "15% OFF")
  - Discount reason
  - Expiration status (if applicable)
  - "Set Discount" button if no discount exists

**Mobile View**:
- Discount info shown in user card details
- "Discount" button for managing discounts

### Discount Management Modal

Admins can click "Discount" or "Edit Discount" to open a modal with:

1. **Discount Percentage Input**
   - Number input (0-100)
   - Shows "%" symbol
   - Validation for valid range

2. **Discount Reason Input** (Optional)
   - Text input for reason
   - Examples: "VIP Customer", "Loyalty Reward", "Bulk Buyer"

3. **Valid Until Date** (Optional)
   - Date picker
   - Only future dates allowed
   - Leave empty for permanent discount

4. **Current Discount Display**
   - Shows existing discount information if any
   - Highlighted in yellow background

5. **Action Buttons**:
   - **Cancel**: Close modal without changes
   - **Remove**: Remove existing discount (only shown if discount exists)
   - **Save Discount**: Apply the discount

## Discount Application in Orders

### Customer Checkout (API)

**Endpoint**: `POST /api/orders`

When a customer creates an order:

1. System fetches user's discount information
2. Checks if discount is valid (not expired)
3. Calculates discounted totals:

```typescript
// Fetch customer discount
const customerDiscount = user.discountPercent || 0;

// Check expiration
const isDiscountValid = !user.discountValidUntil || 
                        new Date(user.discountValidUntil) > new Date();

const applicableDiscount = isDiscountValid ? customerDiscount : 0;

// Calculate totals
const subtotal = items.reduce((sum, item) => 
  sum + (item.wholesalePrice * item.quantity), 0
);

const discountAmount = subtotal * (applicableDiscount / 100);
const subtotalAfterDiscount = subtotal - discountAmount;
const total = subtotalAfterDiscount + shippingCharge;
```

4. Order stores both original and discounted prices:

```json
{
  "subtotal": 10000,
  "discountAmount": 1500,
  "subtotalAfterDiscount": 8500,
  "shippingCharge": 100,
  "total": 8600,
  "customerDiscount": 15
}
```

### Admin Manual Order Creation

**Endpoint**: `POST /api/admin/orders/create`

When admin creates an order manually:

1. Admin selects customer
2. System automatically fetches customer's discount
3. Applies discount to order totals
4. Shows discounted prices in order summary

**Request Example**:
```json
{
  "customerId": "user123",
  "items": [
    {
      "productId": "prod456",
      "quantity": 100
    }
  ],
  "shippingCharge": 100
}
```

**Response with Discount**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order789",
      "subtotal": 10000,
      "customerDiscount": 15,
      "discountAmount": 1500,
      "subtotalAfterDiscount": 8500,
      "shippingCharge": 100,
      "total": 8600
    }
  }
}
```

## Activity Logging

All discount changes are logged:

```json
{
  "action": "customer_discount_updated",
  "userId": "admin123",
  "customerId": "user456",
  "details": "Set 15% discount (VIP Customer) valid until 2024-12-31"
}
```

## Use Cases

### 1. VIP Customer Discount

**Scenario**: Regular customer who consistently orders large quantities

**Setup**:
- Discount: 15%
- Reason: "VIP Customer - High Volume"
- Valid Until: Permanent (leave empty)

**Result**: Customer automatically gets 15% off all orders

### 2. Promotional Discount

**Scenario**: Limited-time offer for specific customer

**Setup**:
- Discount: 20%
- Reason: "Festival Promotion"
- Valid Until: 2024-12-31

**Result**: Customer gets 20% off until the expiration date

### 3. Loyalty Reward

**Scenario**: Long-term customer appreciation

**Setup**:
- Discount: 10%
- Reason: "5 Year Loyalty Reward"
- Valid Until: Permanent

**Result**: Customer gets 10% off all future orders

## Benefits Over Per-Product Pricing

1. **Simplicity**: One discount applies to all products
2. **Maintainability**: No need to manage individual product prices
3. **Scalability**: New products automatically inherit the discount
4. **Transparency**: Clear percentage discount visible to admin
5. **Flexibility**: Easy to adjust or remove discounts

## Technical Implementation

### Files Modified

1. **Database Schema**:
   - `prisma/schema.prisma` - Added discount fields to User model

2. **API Endpoints**:
   - `src/app/api/orders/route.ts` - Checkout with discount
   - `src/app/api/admin/orders/create/route.ts` - Manual orders with discount
   - `src/app/api/admin/customers/[id]/discount/route.ts` - Discount management
   - `src/app/api/admin/users/route.ts` - Include discount in user list

3. **Admin UI**:
   - `src/app/admin/users/page.tsx` - Discount column and management modal

## Testing Checklist

- [ ] Admin can set discount for customer
- [ ] Admin can view discount in user list
- [ ] Admin can edit existing discount
- [ ] Admin can remove discount
- [ ] Admin can set expiration date
- [ ] Discount applies correctly in checkout
- [ ] Expired discounts are not applied
- [ ] Discount shows in order details
- [ ] Manual order creation applies discount
- [ ] Activity log records discount changes
- [ ] Mobile view displays discount info
- [ ] Desktop table shows discount column
- [ ] Modal validates discount percentage (0-100)
- [ ] Modal prevents past expiration dates

## Migration from CustomerPricing Model

If you previously implemented the `CustomerPricing` model:

1. **Remove CustomerPricing Model**:
```prisma
// DELETE THIS MODEL
model CustomerPricing {
  id         String   @id @default(cuid())
  userId     String
  productId  String
  customPrice Float
  // ...
}
```

2. **Add Discount Fields to User**:
```prisma
// ADD THESE FIELDS
model User {
  // ...
  discountPercent    Float?
  discountReason     String?
  discountValidUntil DateTime?
}
```

3. **Run Migration**:
```bash
npx prisma migrate dev --name simplify-to-discount-system
```

4. **Data Migration** (if needed):
   - Calculate average discount from CustomerPricing records
   - Convert to percentage discount
   - Update User records

## Future Enhancements

Potential improvements:

1. **Discount Tiers**: Different discounts for different order values
2. **Category-Specific Discounts**: Discount only on specific product categories
3. **Bulk Discount Rules**: Automatic discounts based on quantity ordered
4. **Customer Groups**: Assign discounts to customer groups instead of individuals
5. **Discount History**: Track discount changes over time
6. **Customer Notification**: Email customers when discount is applied
7. **Discount Analytics**: Report on discount usage and revenue impact

## Support

For questions or issues:
- Check activity logs for discount operations
- Verify discount expiration dates
- Ensure admin has proper permissions
- Check database schema is up to date
