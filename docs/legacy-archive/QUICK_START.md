# Quick Start Guide: Implementing B2C & B2B

## 🚀 Get Started in 5 Steps

### Step 1: Update Database (5 minutes)
```bash
# Navigate to your project
cd d:\partnershipbusinesses\skyzone\skyzonebd

# Format the updated schema
npx prisma format

# Create and apply migration
npx prisma migrate dev --name add_b2c_b2b_support

# Generate Prisma Client
npx prisma generate
```

### Step 2: Test the Utilities (2 minutes)
The pricing utilities are ready to use. Test them:

```typescript
import { calculatePrice, formatPrice } from '@/utils/pricing';

// Example product
const product = {
  retailPrice: 5000,
  wholesaleEnabled: true,
  wholesaleMOQ: 50,
  wholesaleTiers: [
    { minQuantity: 50, maxQuantity: 99, price: 4000, discount: 20 },
    { minQuantity: 100, maxQuantity: null, price: 3500, discount: 30 },
  ],
};

// Test B2C pricing
const b2cPrice = calculatePrice(product, 1, 'retail');
console.log(formatPrice(b2cPrice.price)); // ৳5,000

// Test B2B pricing
const b2bPrice = calculatePrice(product, 100, 'wholesale');
console.log(formatPrice(b2bPrice.price)); // ৳3,500
console.log(`Save: ${formatPrice(b2bPrice.savings)}`); // Save: ৳150,000
```

### Step 3: Update Registration Page (10 minutes)

Replace your existing registration page:

**File: `src/app/auth/register/page.tsx`**

```tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import RegistrationForm from '@/app/components/RegistrationForm';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError('');
      await register(data);
      
      if (data.userType === 'wholesale') {
        router.push('/verification-pending');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-gray-600">
            Join SkyZone BD as a retail or wholesale customer
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white p-8 rounded-lg shadow-lg">
          <RegistrationForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

### Step 4: Update Product Display (15 minutes)

Update your product detail page to show appropriate pricing:

**File: `src/app/products/[id]/page.tsx`**

Add this import:
```tsx
import PriceDisplay from '@/app/components/PriceDisplay';
import { useAuth } from '@/contexts/AuthContext';
```

Replace the price section with:
```tsx
const { user } = useAuth();
const userType = user?.userType || 'guest';

// In your JSX:
<PriceDisplay 
  product={product}
  quantity={quantity}
  userType={userType}
  showWholesaleTiers={true}
/>
```

### Step 5: Update AuthContext (10 minutes)

Add helper properties to your AuthContext:

**File: `src/contexts/AuthContext.tsx`**

Add these computed properties:
```tsx
const value: AuthContextType = {
  user,
  isLoading,
  isAuthenticated,
  isRetailCustomer: user?.userType === 'retail',
  isWholesaleCustomer: user?.userType === 'wholesale',
  login,
  register,
  logout,
};
```

## 🎯 Quick Win: Show Wholesale Upgrade Message

Add this component to your homepage to encourage B2C → B2B upgrade:

```tsx
// components/WholesaleUpgradeBanner.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function WholesaleUpgradeBanner() {
  const { user, isRetailCustomer } = useAuth();

  if (!user || !isRetailCustomer) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-lg mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">💼</span>
          <div>
            <h3 className="font-bold text-lg">Buy in Bulk & Save More!</h3>
            <p className="text-sm text-blue-100">
              Unlock wholesale pricing with discounts up to 40%
            </p>
          </div>
        </div>
        <a 
          href="/wholesale/register"
          className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
        >
          Upgrade to Wholesale
        </a>
      </div>
    </div>
  );
}
```

## 📊 Testing Checklist

### Test B2C Flow:
- [ ] Register as retail customer
- [ ] See retail prices on products
- [ ] Add 1 unit to cart
- [ ] See wholesale upgrade suggestion
- [ ] Complete checkout

### Test B2B Flow:
- [ ] Register as wholesale customer
- [ ] Fill business information
- [ ] See "pending verification" message
- [ ] Admin approves account
- [ ] Login and see wholesale prices
- [ ] Try ordering below MOQ (should show message)
- [ ] Order above MOQ (should get wholesale price)
- [ ] See tiered pricing table
- [ ] See savings calculation

## 🎨 UI Enhancements (Optional)

### Add User Type Badge
```tsx
// Show user type in header
{user && (
  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
    {user.userType === 'retail' ? '🛍️ Retail' : '🏢 Wholesale'}
  </span>
)}
```

### Add Price Comparison Tooltip
```tsx
// Show retail vs wholesale comparison
{isWholesaleCustomer && (
  <div className="text-sm text-green-600 mt-2">
    💰 You're saving ৳{savings.toLocaleString()} compared to retail price!
  </div>
)}
```

## 🔐 Security Notes

1. **Always validate user type on backend**
   ```typescript
   // In API routes
   if (userType === 'wholesale' && !user.isVerified) {
     return res.status(403).json({ error: 'Account not verified' });
   }
   ```

2. **Enforce MOQ in cart**
   ```typescript
   if (userType === 'wholesale' && quantity < product.wholesaleMOQ) {
     throw new Error(`Minimum order quantity is ${product.wholesaleMOQ}`);
   }
   ```

3. **Hide wholesale prices from unverified users**
   ```typescript
   if (userType === 'wholesale' && !user.isVerified) {
     // Show retail prices with "pending verification" message
   }
   ```

## 📚 Documentation Files

You now have these comprehensive guides:
1. **B2B_B2C_IMPLEMENTATION.md** - Complete feature guide
2. **B2C_VS_B2B_COMPARISON.md** - Visual comparison
3. **IMPLEMENTATION_SUMMARY.md** - Technical implementation details
4. **QUICK_START.md** (this file) - Get started fast

## 🆘 Common Issues

### Issue 1: Prices not updating
**Solution**: Clear localStorage and restart dev server
```bash
# In browser console
localStorage.clear();
```

### Issue 2: User type not persisting
**Solution**: Check AuthContext is wrapping entire app in layout.tsx

### Issue 3: Wholesale tiers not showing
**Solution**: Ensure `wholesaleEnabled: true` and `wholesaleTiers` array exists on product

## 🎉 Success Indicators

You'll know it's working when:
- ✅ B2C customers see retail prices
- ✅ B2B customers see wholesale tiers
- ✅ Prices update based on quantity
- ✅ MOQ is enforced correctly
- ✅ Savings are calculated accurately
- ✅ Registration differentiates user types

## 🚀 Go Live Checklist

Before launching:
- [ ] Test all registration flows
- [ ] Verify business verification workflow
- [ ] Test pricing calculations
- [ ] Ensure MOQ enforcement
- [ ] Test cart with both user types
- [ ] Verify checkout flows
- [ ] Test payment methods
- [ ] Review security measures
- [ ] Load test with sample data
- [ ] Train admin team on verification process

## 📞 Next Steps

1. Implement the updates in Steps 1-5
2. Test both B2C and B2B flows
3. Add sample products with wholesale tiers
4. Set up admin panel for verification
5. Train team on new features
6. Launch and monitor!

---

**You're ready to launch a dual B2C/B2B platform! 🎉**

Need help? Review the detailed documentation files or ask questions!
