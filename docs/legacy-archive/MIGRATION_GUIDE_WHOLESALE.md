# 🔄 Migration Guide: B2B/B2C to Wholesale-Only

## 📋 Pre-Migration Checklist

- [ ] **Backup Database**: Create full database backup
- [ ] **Export Data**: Export all existing orders, products, and users
- [ ] **Test Environment**: Test migration on staging environment first
- [ ] **Notify Users**: Inform customers about platform changes
- [ ] **Update Terms**: Update Terms of Service for wholesale-only
- [ ] **Documentation**: Prepare customer onboarding documents

---

## 🗄️ Step 1: Database Migration

### 1.1 Create Migration File

```bash
# Generate migration
npx prisma migrate dev --name wholesale_only_with_profit_sharing
```

### 1.2 Apply Schema Changes

The Prisma schema has been updated. Apply the migration:

```bash
# Apply migration to production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### 1.3 Manual Data Updates

Execute these SQL scripts in order:

#### A. Update Products Table

```sql
-- Add new columns if not exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS basePrice FLOAT,
ADD COLUMN IF NOT EXISTS moq INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS platformProfitPercentage FLOAT DEFAULT 15,
ADD COLUMN IF NOT EXISTS reorderLevel INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS reorderQuantity INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS costPerUnit FLOAT,
ADD COLUMN IF NOT EXISTS shippingCost FLOAT,
ADD COLUMN IF NOT EXISTS handlingCost FLOAT,
ADD COLUMN IF NOT EXISTS allowSamples BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sampleMOQ INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS customizationAvailable BOOLEAN DEFAULT false;

-- Set base price (70% of wholesale/retail price as cost)
UPDATE products 
SET basePrice = COALESCE(wholesalePrice, price) * 0.7
WHERE basePrice IS NULL;

-- Set wholesale price from retail price for products that don't have it
UPDATE products 
SET wholesalePrice = price
WHERE wholesalePrice IS NULL;

-- Set default MOQ
UPDATE products 
SET moq = CASE 
  WHEN wholesaleMOQ IS NOT NULL THEN wholesaleMOQ
  WHEN minOrderQuantity > 1 THEN minOrderQuantity
  ELSE 10
END
WHERE moq IS NULL;

-- Set platform profit percentage
UPDATE products 
SET platformProfitPercentage = 15
WHERE platformProfitPercentage IS NULL;

-- Calculate profit
UPDATE products 
SET calculatedProfit = (wholesalePrice - basePrice) * (platformProfitPercentage / 100)
WHERE calculatedProfit IS NULL;

-- Set cost per unit
UPDATE products
SET costPerUnit = basePrice
WHERE costPerUnit IS NULL;

-- Remove retail-specific columns (optional - keep for rollback)
-- ALTER TABLE products DROP COLUMN IF EXISTS retailPrice;
-- ALTER TABLE products DROP COLUMN IF EXISTS salePrice;
-- ALTER TABLE products DROP COLUMN IF EXISTS retailMOQ;
```

#### B. Update Users Table

```sql
-- Add new columns if not exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profitSharePercentage FLOAT,
ADD COLUMN IF NOT EXISTS isProfitPartner BOOLEAN DEFAULT false;

-- Convert all RETAIL and GUEST users to WHOLESALE
UPDATE users 
SET userType = 'WHOLESALE'
WHERE userType IN ('RETAIL', 'GUEST');

-- Make companyName required (set default for existing users)
UPDATE users 
SET companyName = COALESCE(companyName, name || ' Company')
WHERE companyName IS NULL;

-- Ensure all users have business info
INSERT INTO business_info (
  id, 
  userId, 
  companyType, 
  registrationNumber, 
  taxId, 
  tradeLicenseUrl,
  verificationStatus,
  createdAt,
  updatedAt
)
SELECT 
  gen_random_uuid(),
  u.id,
  'Retailer',
  'PENDING-' || u.id,
  'PENDING-' || u.id,
  'PENDING',
  'PENDING',
  NOW(),
  NOW()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM business_info bi WHERE bi.userId = u.id
)
AND u.role = 'BUYER';
```

#### C. Update Orders Table

```sql
-- Add new columns if not exist
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS totalCost FLOAT,
ADD COLUMN IF NOT EXISTS grossProfit FLOAT,
ADD COLUMN IF NOT EXISTS platformProfit FLOAT,
ADD COLUMN IF NOT EXISTS sellerProfit FLOAT,
ADD COLUMN IF NOT EXISTS profitMargin FLOAT,
ADD COLUMN IF NOT EXISTS purchaseOrderNumber TEXT,
ADD COLUMN IF NOT EXISTS deliveryDate TIMESTAMP,
ADD COLUMN IF NOT EXISTS paymentTerms TEXT,
ADD COLUMN IF NOT EXISTS invoiceUrl TEXT,
ADD COLUMN IF NOT EXISTS internalNotes TEXT;

-- Set payment terms for existing orders
UPDATE orders
SET paymentTerms = 'NET30'
WHERE paymentTerms IS NULL AND paymentMethod LIKE '%INVOICE%';

-- Calculate profit for existing orders (simplified)
UPDATE orders o
SET 
  totalCost = o.total * 0.6,  -- Assume 60% cost ratio
  grossProfit = o.total * 0.4,
  platformProfit = o.total * 0.4 * 0.15,  -- 15% of gross profit
  profitMargin = 40
WHERE totalCost IS NULL;

-- Remove guest user references (link to admin or create wholesale account)
UPDATE orders
SET userId = (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
WHERE userId IS NULL;
```

#### D. Update Order Items Table

```sql
-- Add new columns if not exist
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS costPerUnit FLOAT,
ADD COLUMN IF NOT EXISTS profitPerUnit FLOAT,
ADD COLUMN IF NOT EXISTS totalProfit FLOAT,
ADD COLUMN IF NOT EXISTS profitMargin FLOAT;

-- Calculate profit for existing order items
UPDATE order_items oi
SET 
  costPerUnit = oi.price * 0.6,  -- Assume 60% cost
  profitPerUnit = oi.price * 0.4,
  totalProfit = oi.price * 0.4 * oi.quantity,
  profitMargin = 40
WHERE costPerUnit IS NULL;
```

#### E. Create Platform Config

```sql
-- Create platform config table if not exists
CREATE TABLE IF NOT EXISTS platform_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO platform_config (key, value, description, category) VALUES
('default_platform_profit_percentage', '15', 'Default profit percentage for platform', 'profit'),
('minimum_order_value', '1000', 'Minimum order value in BDT', 'general'),
('default_moq', '10', 'Default minimum order quantity', 'general'),
('reorder_notification_enabled', 'true', 'Enable reorder notifications', 'inventory'),
('maximum_credit_limit', '100000', 'Maximum credit limit for customers in BDT', 'general'),
('default_payment_terms', 'NET30', 'Default payment terms', 'general'),
('low_stock_threshold_percentage', '20', 'Alert when stock is below this % of reorder level', 'inventory')
ON CONFLICT (key) DO NOTHING;
```

#### F. Create Supporting Tables

```sql
-- Create inventory logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previousStock INTEGER NOT NULL,
  newStock INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  performedBy TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_logs_product ON inventory_logs(productId);
CREATE INDEX idx_inventory_logs_action ON inventory_logs(action);
CREATE INDEX idx_inventory_logs_created ON inventory_logs(createdAt);

-- Create profit reports table
CREATE TABLE IF NOT EXISTS profit_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  productId TEXT REFERENCES products(id) ON DELETE SET NULL,
  revenue FLOAT NOT NULL,
  costOfGoods FLOAT NOT NULL,
  grossProfit FLOAT NOT NULL,
  shippingExpense FLOAT DEFAULT 0,
  handlingExpense FLOAT DEFAULT 0,
  platformExpense FLOAT DEFAULT 0,
  marketingExpense FLOAT DEFAULT 0,
  otherExpenses FLOAT DEFAULT 0,
  totalExpenses FLOAT NOT NULL,
  netProfit FLOAT NOT NULL,
  profitMargin FLOAT NOT NULL,
  platformProfit FLOAT NOT NULL,
  platformProfitPercent FLOAT NOT NULL,
  sellerProfit FLOAT NOT NULL,
  sellerProfitPercent FLOAT NOT NULL,
  sellerId TEXT,
  reportPeriod TEXT,
  reportDate TIMESTAMP DEFAULT NOW(),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profit_reports_order ON profit_reports(orderId);
CREATE INDEX idx_profit_reports_product ON profit_reports(productId);
CREATE INDEX idx_profit_reports_date ON profit_reports(reportDate);

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT DEFAULT 'Bangladesh',
  contactPerson TEXT,
  contactPhone TEXT,
  isActive BOOLEAN DEFAULT true,
  isPrimary BOOLEAN DEFAULT false,
  capacity INTEGER,
  currentLoad INTEGER,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create primary warehouse
INSERT INTO warehouses (name, code, address, city, isActive, isPrimary) VALUES
('Main Warehouse', 'WH-MAIN-01', 'Main Office Location', 'Dhaka', true, true)
ON CONFLICT (code) DO NOTHING;
```

---

## 🔄 Step 2: Code Updates

### 2.1 Update Environment Variables

Add to `.env`:

```env
# Profit Sharing
DEFAULT_PLATFORM_PROFIT_PERCENTAGE=15
ENABLE_PROFIT_SHARING=true

# Inventory
ENABLE_REORDER_ALERTS=true
LOW_STOCK_THRESHOLD=20

# Wholesale
DEFAULT_MOQ=10
MINIMUM_ORDER_VALUE=1000
```

### 2.2 Update Prisma Schema

The schema is already updated. Regenerate client:

```bash
npx prisma generate
```

### 2.3 Update Types

Types have been updated in:
- `/src/types/auth.ts` - Removed retail, added profit fields
- `/src/types/product.ts` - Updated for wholesale-only

### 2.4 Update Utilities

New utilities created:
- `/src/utils/profitCalculation.ts` - Profit calculations
- `/src/utils/wholesalePricing.ts` - Wholesale pricing
- `/src/utils/inventoryManagement.ts` - Inventory management

Updated utilities:
- `/src/utils/pricing.ts` - Removed retail logic

---

## 🎨 Step 3: Frontend Updates

### 3.1 Remove Retail Components

Delete or disable these components:
```bash
# Components to remove
- /components/RetailProductCard
- /components/GuestCheckout
- /components/RetailPricingDisplay
- /app/shop/retail
```

### 3.2 Update Navigation

Update main navigation to remove:
- "Shop" (retail section)
- "Browse Products" (if retail-focused)
- Guest checkout options

Add:
- "Wholesale Center"
- "Bulk Orders"
- "Request Quote (RFQ)"
- "Business Verification"

### 3.3 Update Product Pages

Update product display to show:
- Wholesale price only
- MOQ prominently
- Volume discount tiers
- Bulk savings calculator
- Profit margin (admin only)

### 3.4 Update Forms

**Registration Form**:
```tsx
// Make business info required
<input 
  name="companyName" 
  required 
  placeholder="Company Name *" 
/>
<input 
  name="registrationNumber" 
  required 
  placeholder="Business Registration Number *" 
/>
<FileUpload 
  name="tradeLicense" 
  required 
  label="Trade License *" 
/>
```

**Product Form** (Admin):
```tsx
<input 
  name="basePrice" 
  label="Cost Price (Base Price)" 
  required 
/>
<input 
  name="wholesalePrice" 
  label="Wholesale Price" 
  required 
/>
<input 
  name="moq" 
  label="Minimum Order Quantity" 
  min="1" 
  defaultValue="10" 
/>
<input 
  name="platformProfitPercentage" 
  label="Platform Profit %" 
  min="0" 
  max="100" 
  defaultValue="15" 
/>
```

---

## 📊 Step 4: Admin Panel Updates

### 4.1 Add Profit Dashboard

Create `/app/admin/profit-sharing/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function ProfitSharingPage() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetchProfitStats();
  }, []);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Profit Sharing Dashboard</h1>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value={stats?.totalRevenue} />
        <StatCard title="Platform Profit" value={stats?.platformProfit} />
        <StatCard title="Seller Profit" value={stats?.sellerProfit} />
        <StatCard title="Profit Margin" value={stats?.profitMargin + '%'} />
      </div>
      
      <ProfitConfigForm />
      <ProfitReportsTable />
    </div>
  );
}
```

### 4.2 Add Inventory Dashboard

Create `/app/admin/inventory/page.tsx`:

```tsx
'use client';

import { generateStockAlerts } from '@/utils/inventoryManagement';

export default function InventoryPage() {
  const [alerts, setAlerts] = useState([]);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
      
      <StockAlertsPanel alerts={alerts} />
      <InventoryTable />
      <ReorderRecommendations />
    </div>
  );
}
```

### 4.3 Update Product Management

Add profit configuration fields:
- Base Price (Cost)
- Wholesale Price
- Platform Profit %
- Seller Commission %

Add inventory fields:
- Reorder Level
- Reorder Quantity
- Stock Alerts

---

## 🧪 Step 5: Testing

### 5.1 Test User Registration

```bash
# Test wholesale registration
- Fill all required business fields
- Upload trade license
- Verify email
- Check business_info created
- Confirm userType = WHOLESALE
```

### 5.2 Test Product Creation

```bash
# Test product with profit calculation
- Set base price: 1000
- Set wholesale price: 1500
- Set profit %: 15
- Verify calculated profit: 75
- Add tiered pricing
- Check MOQ enforcement
```

### 5.3 Test Order Flow

```bash
# Test order with profit calculation
- Add products to cart
- Check MOQ validation
- Place order
- Verify profit calculated
- Check inventory deducted
- Confirm profit report generated
```

### 5.4 Test Inventory Alerts

```bash
# Test reorder alerts
- Set stock = 15
- Set reorder level = 20
- Check alert generated
- Verify alert severity
- Test reorder calculation
```

---

## 📱 Step 6: Mobile App Updates

If you have a mobile app, update:

### Android App
- Update registration flow
- Remove retail checkout
- Add business verification
- Update product display
- Add MOQ validation

### iOS App
- Same as Android updates

---

## 📧 Step 7: Customer Communication

### 7.1 Email Template

```html
Subject: Important Update: Transitioning to Wholesale-Only Platform

Dear Valued Customer,

We're excited to announce that we're transitioning to a dedicated wholesale platform! This change allows us to better serve businesses with:

✅ Better bulk pricing
✅ Volume discounts
✅ Dedicated support
✅ Flexible payment terms

**What You Need to Do:**
1. Complete business verification
2. Upload trade license
3. Provide tax documents

**Benefits:**
- Save up to 20% with volume pricing
- Access to exclusive wholesale products
- Extended payment terms (NET30/NET60)
- Priority order processing

Visit your account to complete verification.

Best regards,
SkyZone BD Team
```

### 7.2 In-App Notifications

Show banner to all users:
- "Complete business verification to continue ordering"
- Link to verification form
- Deadline for completion

---

## 🔒 Step 8: Security Updates

### 8.1 Update Middleware

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const user = getUserFromToken(request);
  
  // Require business verification
  if (user && !user.isVerified) {
    return NextResponse.redirect('/verify-business');
  }
  
  // Block guest checkout
  if (request.url.includes('/checkout') && !user) {
    return NextResponse.redirect('/login');
  }
  
  return NextResponse.next();
}
```

### 8.2 API Route Protection

```typescript
// Protect profit endpoints
if (!isAdmin(user)) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 403 }
  );
}

// Require business verification
if (user.userType === 'WHOLESALE' && !user.isVerified) {
  return NextResponse.json(
    { error: 'Business verification required' },
    { status: 403 }
  );
}
```

---

## 📈 Step 9: Monitoring & Rollback

### 9.1 Set Up Monitoring

```typescript
// Monitor key metrics
- User conversion rate (retail → wholesale)
- Order volume changes
- Average order value
- Profit margins
- Inventory turnover
- Customer complaints
```

### 9.2 Rollback Plan

If issues occur:

```sql
-- Rollback database
npx prisma migrate reset

-- Restore from backup
pg_restore -d dbname backup_file.sql

-- Revert code
git revert <commit-hash>
git push origin main
```

---

## ✅ Post-Migration Checklist

- [ ] All users migrated to wholesale
- [ ] All products have profit calculations
- [ ] Inventory alerts working
- [ ] Profit reports generating
- [ ] Business verification functional
- [ ] MOQ enforcement active
- [ ] Tiered pricing working
- [ ] Admin dashboards operational
- [ ] Customer notifications sent
- [ ] Mobile apps updated
- [ ] Documentation updated
- [ ] Team trained on new system

---

## 📞 Support

For migration issues:
1. Check logs: `/var/log/app.log`
2. Review Prisma errors: `npx prisma studio`
3. Test in staging first
4. Contact development team

---

## 🎉 Go Live

Once testing complete:

1. **Schedule Maintenance Window**
   - Notify users 48 hours in advance
   - Choose low-traffic time
   - Estimate 2-4 hours downtime

2. **Execute Migration**
   - Put site in maintenance mode
   - Run database migration
   - Deploy code updates
   - Test critical flows
   - Remove maintenance mode

3. **Monitor First 24 Hours**
   - Watch error logs
   - Check order processing
   - Monitor user feedback
   - Be ready for hotfixes

4. **Gradual Rollout**
   - Start with test users
   - Enable for 10% of users
   - Monitor for issues
   - Gradually increase to 100%

---

**Migration Complete! 🎊**

Your platform is now a professional wholesale-only marketplace following Amazon Business and Alibaba standards.
