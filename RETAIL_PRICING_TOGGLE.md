# Retail Pricing Toggle Guide

## Current Status: DISABLED (Wholesale Only Mode)

The retail pricing option has been **completely disabled** across the entire platform. The system is currently operating in **wholesale-only mode**.

## Files Modified

### Admin Panel
1. **src/app/admin/products/new/page.tsx**
   - Line ~485: Retail Pricing section wrapped in `{false && (...)}`
   - Line ~229: Validation updated to not require `retailPrice`
   - Line ~260: Product data submission uses default values (0) for retail prices

2. **src/app/admin/products/[id]/edit/page.tsx**
   - Line ~667: Retail pricing fields wrapped in `{false && (...)}`

3. **src/app/admin/users/page.tsx**
   - Line ~508: Retail filter option commented out in user type dropdown

### API Endpoints
4. **src/app/api/products/route.ts**
   - Line ~212: Removed `retailPrice` from required fields validation

### Authentication
5. **src/app/auth/register/page.tsx**
   - Line ~49: Changed default user type from `RETAIL` to `WHOLESALE`
   - Line ~64: Updated page title from "Create your B2B account" to "Create your wholesale account"
   - Line ~68: Updated description from "retailers" to "suppliers"

## Summary of Changes

### ✅ Admin Panel
- Retail pricing form fields hidden in product add/edit pages
- Retail user type filter hidden (but existing retail users still visible)
- Validation updated to not require retail prices

### ✅ API Layer
- Product creation no longer requires `retailPrice` field
- Default values (0) used for retail prices when not provided

### ✅ User Registration
- New users default to `WHOLESALE` instead of `RETAIL`
- Registration page updated to reflect wholesale-only approach
- Marketing copy updated accordingly

### ✅ Frontend Display
- Product pages display wholesale prices only (via `product.price`)
- Cart enforces wholesale MOQ rules
- No retail-specific pricing display anywhere

## How to Re-enable Retail Pricing

When you're ready to enable retail pricing, follow these steps:

### Step 1: Enable in New Product Form
In `src/app/admin/products/new/page.tsx`:

1. Find line ~485 and change:
   ```tsx
   {false && (
   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
   ```
   To:
   ```tsx
   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
   ```
   (Remove the `{false && (` and the closing `)}`)

2. Find line ~229 and update validation to require retail price:
   ```tsx
   if (!formData.name || !formData.retailPrice || !formData.category) {
   ```

3. Find line ~260 and update to use actual retail price:
   ```tsx
   retailPrice: parseFloat(formData.retailPrice),
   price: parseFloat(formData.retailPrice),
   ```

### Step 2: Enable in Edit Product Form
In `src/app/admin/products/[id]/edit/page.tsx`:

1. Find line ~667 and change:
   ```tsx
   {false && (
   <>
   <div>...</div>
   </>
   )}
   ```
   To:
   ```tsx
   <>
   <div>...</div>
   </>
   ```
   (Remove the `{false && (` and the closing `)}`)

### Step 3: Re-enable API Validation
In `src/app/api/products/route.ts`:

1. Find line ~212 and restore retail price requirement:
   ```typescript
   const requiredFields = ['name', 'slug', 'categoryId', 'imageUrl', 'price', 'retailPrice'];
   ```

### Step 4: Update User Registration
In `src/app/auth/register/page.tsx`:

1. Find line ~49 and change back to:
   ```typescript
   userType: 'RETAIL' // or make it selectable
   ```

2. Update page title and descriptions as needed

### Step 5: Update Admin Filters
In `src/app/admin/users/page.tsx`:

1. Find line ~508 and uncomment:
   ```tsx
   <option value="retail">Retail</option>
   ```

### Step 6: Rebuild
```bash
npm run build
```

## Current Behavior

- ✅ Products can be added with **wholesale pricing only**
- ✅ Retail price fields are completely hidden from the UI
- ✅ System uses default value of 0 for retail prices
- ✅ All existing products retain their retail pricing data (not deleted)
- ✅ New user registrations default to WHOLESALE type
- ✅ Admin filters hide retail option (but existing retail users still accessible)
- ✅ API endpoints don't require retail price
- ✅ Frontend displays only wholesale prices

## Technical Notes

- The database schema still contains retail pricing fields (`retailPrice`, `salePrice`, etc.)
- Existing products with retail prices are unaffected - data preserved
- Existing RETAIL users can still use the system normally
- This is primarily a UI/UX change - no data loss
- You can switch between wholesale-only and retail+wholesale modes at any time
- The UserType enum in the database still supports RETAIL, WHOLESALE, SELLER, ADMIN, GUEST

## Important Considerations

### For Existing Data:
- Products with retail prices: Data preserved but not displayed/editable
- Existing retail users: Can still login and use the system
- Orders from retail users: Historical data intact

### For New Data:
- New products: Retail price defaults to 0
- New users: Automatically set to WHOLESALE type
- New orders: Calculated using wholesale prices only

---
Last Updated: January 7, 2026
