# Quick Reference: Customer Discount System

## For Admins

### How to Set a Customer Discount

1. Go to **Admin Panel** → **User Management**
2. Find the customer in the list
3. Click **"Discount"** button (or **"Edit Discount"** if they already have one)
4. In the modal:
   - Enter discount percentage (0-100)
   - Add a reason (optional) - e.g., "VIP Customer"
   - Set expiration date (optional) - leave empty for permanent
5. Click **"Save Discount"**

### How to View Discounts

**Desktop View**:
- Discount column shows percentage, reason, and expiration
- Green badge: "15% OFF"
- Orange text: Expiration date
- Red text: "Expired"

**Mobile View**:
- Discount info appears in the user card
- Shows percentage and reason

### How to Remove a Discount

1. Click **"Edit Discount"** on the customer
2. In the modal, click **"Remove"** button
3. Confirm the removal

## How Discounts Work

### Automatic Application

When a customer with a discount places an order:

```
Product Price: ৳100
Quantity: 10
Subtotal: ৳1,000

Customer Discount: 15%
Discount Amount: ৳150
Subtotal After Discount: ৳850

Shipping: ৳100
Total: ৳950
```

### Expiration

- Permanent discounts: No expiration date set
- Temporary discounts: Automatically stop working after expiration date
- Expired discounts show in red in the UI but don't affect orders

### Order Display

Orders show:
- Original subtotal
- Discount percentage applied
- Discount amount
- Final total after discount

## Admin Features

### User Management Page

**Discount Column**: Shows current discount or "Set Discount" button

**Actions**:
- **Edit**: Edit user profile
- **Orders**: View customer's orders
- **Discount**: Manage customer discount

### Manual Order Creation

When creating an order for a customer:
- System automatically applies their discount
- Shows discounted totals
- No manual calculation needed

## Quick Examples

### Example 1: VIP Customer
- **Discount**: 15%
- **Reason**: "VIP Customer"
- **Valid Until**: (empty - permanent)

### Example 2: Promotion
- **Discount**: 20%
- **Reason**: "Festival Sale"
- **Valid Until**: 2024-12-31

### Example 3: Bulk Buyer
- **Discount**: 10%
- **Reason**: "Regular Bulk Orders"
- **Valid Until**: (empty - permanent)

## API Endpoints (for developers)

### Set Discount
```
PATCH /api/admin/customers/[id]/discount
{
  "discountPercent": 15,
  "discountReason": "VIP Customer",
  "discountValidUntil": "2024-12-31"
}
```

### Remove Discount
```
PATCH /api/admin/customers/[id]/discount
{
  "discountPercent": 0,
  "discountReason": null,
  "discountValidUntil": null
}
```

## Database Fields

- `discountPercent`: Float (0-100)
- `discountReason`: String (optional)
- `discountValidUntil`: DateTime (optional)

## Important Notes

1. **Applies to ALL products**: The discount applies to every product in the catalog
2. **Not per-product**: Cannot set different discounts for different products
3. **Automatic**: No manual calculation needed during checkout
4. **Logged**: All discount changes are logged for audit
5. **Admin only**: Only admins can set/remove discounts

## Troubleshooting

**Discount not showing?**
- Refresh the user list page
- Check if discount was saved (look for success message)

**Discount not applying to orders?**
- Check if discount is expired
- Verify customer has discount in user list
- Check order total calculation

**Can't set discount?**
- Ensure you're logged in as admin
- Check percentage is between 0-100
- Verify expiration date is in the future

## Best Practices

1. **Use descriptive reasons**: Helps track why discounts were given
2. **Set expiration for promotions**: Prevents accidental permanent discounts
3. **Review regularly**: Check expired discounts and update as needed
4. **Document policy**: Establish clear criteria for who gets discounts
5. **Monitor impact**: Track total discount amounts in reports

## Related Documentation

- **Full Documentation**: `CUSTOMER_DISCOUNT_SYSTEM.md`
- **Order System**: `ORDER_EDITING_GUIDE.md`
- **Admin Panel**: `ADMIN_PANEL_DOCUMENTATION.md`
