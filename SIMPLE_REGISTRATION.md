# 📝 Simplified Registration System

## 🎯 Overview

Registration has been simplified to require only essential information. Users can complete additional profile details later.

---

## ✅ Required Fields

### For Registered Users
```typescript
{
  name: "John Doe",          // ✅ Required
  email: "john@email.com",   // ✅ Required
  password: "********",       // ✅ Required
  phone: "+880-1711-123456", // ✅ Required (mobile)
  
  // Address will be added during checkout or from profile
}
```

### For Guest Checkout
```typescript
{
  phone: "+880-1711-123456",  // ✅ Required
  shippingAddress: {           // ✅ Required
    street: "123 Main St",
    city: "Dhaka",
    postalCode: "1200",
    country: "Bangladesh"
  },
  
  // Optional
  name: "John Doe",
  email: "john@email.com"
}
```

---

## 📋 Optional Fields (Can Add Later)

All business-related information is **optional** and can be added from profile:

```typescript
// Optional fields
{
  companyName?: string,
  businessInfo?: {
    companyType?: string,
    registrationNumber?: string,
    taxId?: string,
    tradeLicenseUrl?: string,
    website?: string,
    employeeCount?: string,
    annualPurchaseVolume?: string,
    businessAddress?: string,
    businessCity?: string
  }
}
```

---

## 🚀 Registration Flow

### 1. Simple Registration Form

```tsx
<form onSubmit={handleRegister}>
  {/* Required Fields */}
  <input 
    name="name" 
    placeholder="Full Name *" 
    required 
  />
  
  <input 
    name="email" 
    type="email" 
    placeholder="Email *" 
    required 
  />
  
  <input 
    name="phone" 
    type="tel" 
    placeholder="Mobile Number *" 
    required 
  />
  
  <input 
    name="password" 
    type="password" 
    placeholder="Password *" 
    required 
  />
  
  <button type="submit">Register</button>
</form>
```

### 2. Address Added Later

Users add shipping address:
- During first checkout
- From profile settings
- When placing an order

### 3. Business Info (Optional)

Users can add business details from profile:
```
Profile → Business Information → Complete Details
```

---

## 👤 Guest Checkout Flow

```tsx
<form onSubmit={handleGuestCheckout}>
  {/* Required */}
  <input 
    name="phone" 
    placeholder="Mobile Number *" 
    required 
  />
  
  <textarea 
    name="street" 
    placeholder="Delivery Address *" 
    required 
  />
  
  <input 
    name="city" 
    placeholder="City *" 
    required 
  />
  
  {/* Optional */}
  <input 
    name="name" 
    placeholder="Name (optional)" 
  />
  
  <input 
    name="email" 
    type="email" 
    placeholder="Email (optional)" 
  />
  
  <button type="submit">Place Order</button>
</form>
```

---

## 🔄 Profile Completion

### After Registration

Users see a profile completion prompt:

```tsx
<div className="profile-completion">
  <h3>Complete Your Profile</h3>
  <p>Add more details to unlock all features</p>
  
  <ul>
    <li>✅ Name & Email - Complete</li>
    <li>✅ Mobile Number - Complete</li>
    <li>⭕ Shipping Address - Add now</li>
    <li>⭕ Company Details - Optional</li>
    <li>⭕ Business Info - Optional</li>
  </ul>
  
  <button>Complete Profile</button>
</div>
```

### Profile Page Structure

```
My Profile
├── Basic Information ✅
│   ├── Name
│   ├── Email
│   └── Phone
│
├── Addresses ⭕
│   ├── Shipping Address
│   └── Billing Address
│
└── Business Information ⭕ (Optional)
    ├── Company Name
    ├── Company Type
    ├── Registration Number
    ├── Tax ID
    └── Documents
```

---

## 💾 Database Changes

### User Model - Simplified

```prisma
model User {
  id       String  @id @default(cuid())
  name     String  // ✅ Required
  email    String  @unique // ✅ Required
  phone    String  // ✅ Required
  password String  // ✅ Required
  
  // Optional - can add later
  companyName  String?
  businessInfo BusinessInfo? // Optional relation
  
  // Relations
  addresses Address[] // Added during checkout or from profile
}
```

### Address Model

```prisma
model Address {
  id           String      @id @default(cuid())
  userId       String
  type         AddressType @default(SHIPPING)
  street       String      // Required
  city         String      // Required
  postalCode   String?     // Optional
  country      String      @default("Bangladesh")
  isDefault    Boolean     @default(false)
  
  user         User        @relation(fields: [userId], references: [id])
}
```

### Order Model - Supports Guest

```prisma
model Order {
  id           String  @id @default(cuid())
  orderNumber  String  @unique
  
  userId       String? // Nullable for guest orders
  
  // Guest information
  guestPhone   String? // Required for guest
  guestName    String? // Optional
  guestEmail   String? // Optional
  
  // Order details...
}
```

---

## 🔧 API Endpoints

### Register User (Simple)

**POST** `/api/auth/register`

```json
{
  "name": "John Doe",
  "email": "john@email.com",
  "phone": "+880-1711-123456",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@email.com",
    "phone": "+880-1711-123456",
    "isVerified": false
  },
  "message": "Registration successful! You can now add your address."
}
```

### Guest Checkout

**POST** `/api/checkout/guest`

```json
{
  "phone": "+880-1711-123456",
  "shippingAddress": {
    "street": "123 Main St, Apt 4B",
    "city": "Dhaka",
    "postalCode": "1200",
    "country": "Bangladesh"
  },
  "name": "John Doe",
  "email": "john@email.com",
  "items": [...]
}
```

### Add Address

**POST** `/api/user/addresses`

```json
{
  "type": "SHIPPING",
  "street": "123 Main St",
  "city": "Dhaka",
  "postalCode": "1200",
  "country": "Bangladesh",
  "isDefault": true
}
```

### Update Business Info (Optional)

**PUT** `/api/user/business-info`

```json
{
  "companyName": "ABC Trading",
  "companyType": "Retailer",
  "registrationNumber": "REG-123456",
  "taxId": "TIN-789012",
  "website": "https://abc-trading.com"
}
```

---

## 🎨 UI Components

### Registration Form (Simple)

```tsx
export default function SimpleRegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields only
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      alert('Please fill all required fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      });
      
      if (response.ok) {
        alert('Registration successful!');
        // Redirect to login or dashboard
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Create Account</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="John Doe"
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="john@example.com"
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="+880-1711-123456"
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="••••••••"
          required
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="••••••••"
          required
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
      >
        Create Account
      </button>
      
      <p className="mt-4 text-sm text-gray-600 text-center">
        Already have an account? <a href="/login" className="text-blue-600">Login</a>
      </p>
    </form>
  );
}
```

### Guest Checkout Form

```tsx
export default function GuestCheckoutForm() {
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    street: '',
    city: '',
    postalCode: ''
  });

  return (
    <form className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Guest Checkout</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="+880-1711-123456"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Required for order updates
        </p>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Delivery Address <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.street}
          onChange={(e) => setFormData({...formData, street: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="House/Flat, Street, Area"
          rows={3}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Dhaka"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Postal Code
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="1200"
          />
        </div>
      </div>
      
      <div className="border-t pt-4 mb-4">
        <p className="text-sm text-gray-600 mb-3">Optional Information</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Name (Optional)
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="John Doe"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Email (Optional)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="john@example.com"
          />
        </div>
      </div>
      
      <button
        type="submit"
        className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
      >
        Place Order
      </button>
    </form>
  );
}
```

---

## ✅ Benefits

✅ **Quick Registration** - Only 4 fields (name, email, phone, password)  
✅ **Guest Checkout** - Only phone + address needed  
✅ **No Complicated Forms** - No business verification required upfront  
✅ **Progressive Profile** - Users add details when needed  
✅ **Better Conversion** - Simpler = more registrations  
✅ **Flexible** - Users can upgrade to business account later  

---

## 🔄 Migration from Complex System

If you had the complex wholesale-only system, update existing users:

```sql
-- Make business info optional
ALTER TABLE users ALTER COLUMN companyName DROP NOT NULL;
ALTER TABLE business_info ALTER COLUMN companyType DROP NOT NULL;
ALTER TABLE business_info ALTER COLUMN registrationNumber DROP NOT NULL;
ALTER TABLE business_info ALTER COLUMN taxId DROP NOT NULL;
ALTER TABLE business_info ALTER COLUMN tradeLicenseUrl DROP NOT NULL;

-- Allow guest orders
ALTER TABLE orders ALTER COLUMN userId DROP NOT NULL;
```

---

## 📝 Summary

**Registration:** Name + Email + Phone + Password  
**Guest Checkout:** Phone + Address  
**Everything Else:** Optional - add from profile later

Simple, fast, and user-friendly! 🎉
