# 🎯 Custom Pricing & Manual Order Creation - Complete Guide

## Overview
Two powerful features for wholesale business flexibility:
1. **Customer-Specific Pricing** - Assign custom wholesale prices to specific customers
2. **Admin Manual Order Creation** - Create orders on behalf of customers with customized pricing

---

## 🏷️ Feature 1: Customer-Specific Pricing

### What It Does
- Assign custom wholesale prices to individual customers for specific products
- Prices automatically apply when that customer places orders
- Track who assigned the pricing and when
- Set expiration dates for promotional pricing
- Maintain audit trail for compliance

### Database Schema

**CustomerPricing Model:**
```prisma
model CustomerPricing {
  id              String   
  userId          String   // Customer
  productId       String   
  customPrice     Float    // Custom price for this customer
  discountPercent Float?   // Optional discount %
  notes           String?  // Reason for custom pricing
  isActive        Boolean  
  validFrom       DateTime 
  validUntil      DateTime? // Optional expiration
  createdBy       String   // Admin who created it
}
```

### API Endpoints

#### Get Customer Pricing
```
GET /api/admin/customers/{customerId}/pricing
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pricing_id",
      "productId": "product_id",
      "productName": "Product A",
      "standardPrice": 1000,
      "customPrice": 850,
      "savings": 150,
      "discountPercent": 15,
      "notes": "Bulk customer discount",
      "validFrom": "2026-01-01T00:00:00Z",
      "validUntil": null,
      "isActive": true
    }
  ]
}
```

#### Create/Update Customer Pricing
```
POST /api/admin/customers/{customerId}/pricing
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "productId": "product_id",
  "customPrice": 850,
  "discountPercent": 15,
  "notes": "VIP customer discount",
  "validUntil": "2026-12-31T23:59:59Z" // optional
}
```

#### Remove Customer Pricing
```
DELETE /api/admin/customers/{customerId}/pricing?pricingId={pricingId}
Authorization: Bearer {admin_token}
```

### Use Cases

#### 1. **VIP Customer Discounts**
```
Customer: ABC Company
Product: Premium Widget
Standard Price: ৳1,000
Custom Price: ৳850 (15% discount)
Reason: "VIP customer - annual contract"
Valid: Permanent
```

#### 2. **Promotional Pricing**
```
Customer: XYZ Traders
Product: Seasonal Item
Standard Price: ৳500
Custom Price: ৳400 (20% discount)
Reason: "Q1 2026 promotion"
Valid Until: March 31, 2026
```

#### 3. **Volume-Based Custom Pricing**
```
Customer: Mega Distributor
Product: Bulk Item
Standard Price: ৳100
Custom Price: ৳75 (25% discount)
Reason: "Purchases 1000+ units monthly"
Valid: Permanent
```

---

## 📦 Feature 2: Admin Manual Order Creation

### What It Does
- Create orders manually on behalf of customers
- Apply custom prices per item in the order
- Automatically uses customer-specific pricing if available
- Can override prices for special negotiations
- Create guest orders without customer account
- Full control over shipping, tax, payment method

### How It Works

#### Order Creation Flow:
```
1. Admin selects customer (optional)
2. Searches and adds products
   → System checks for customer-specific pricing
   → Applies custom price if available
   → Admin can override price if needed
3. Sets quantity and price for each item
4. Adds shipping address
5. Sets shipping cost and tax
6. Selects payment method
7. Creates order
   → Stock automatically deducted
   → Activity logged
   → Order ready for processing
```

### UI Features

**Customer Selection:**
- 🔍 Search customers by name, email, phone
- 📋 Shows customer details when selected
- 👤 Optional - can create guest orders

**Product Selection:**
- 🔍 Search products with autocomplete
- 📸 Shows product image, price, stock
- ✅ Validates stock availability
- 🏷️ Auto-applies customer-specific pricing

**Order Items:**
- ➕ Add multiple products
- ✏️ Edit quantity for each item
- 💰 Customize price per item
- 🗑️ Remove items
- 💵 Real-time total calculation
- 🏷️ Shows if custom price applied

**Pricing Priority:**
```
1. Admin-specified custom price (highest priority)
2. Customer-specific pricing from database
3. Product standard wholesale price (default)
```

### API Endpoint

#### Create Manual Order
```
POST /api/admin/orders/create
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "customerId": "user_id", // optional for guest orders
  "items": [
    {
      "productId": "product_1",
      "quantity": 10,
      "customPrice": 850 // optional - overrides auto pricing
    },
    {
      "productId": "product_2",
      "quantity": 5
      // no customPrice = uses customer pricing or standard price
    }
  ],
  "shippingAddress": "123 Main St, Dhaka",
  "billingAddress": "Same as shipping",
  "paymentMethod": "BANK_TRANSFER",
  "shipping": 100,
  "tax": 0,
  "notes": "Rush order - deliver by Friday",
  "status": "PENDING" // optional, defaults to PENDING
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "orderNumber": "ORD-20260105-1234",
    "customerId": "user_id",
    "customerName": "ABC Company",
    "items": [
      {
        "productId": "product_1",
        "name": "Product A",
        "quantity": 10,
        "price": 850,
        "total": 8500
      }
    ],
    "subtotal": 8500,
    "shipping": 100,
    "tax": 0,
    "total": 8600,
    "status": "PENDING",
    "createdAt": "2026-01-05T12:00:00Z"
  },
  "message": "Order created successfully"
}
```

### Validations

**Order Creation Checks:**
- ✅ Admin authentication required
- ✅ Customer exists (if provided)
- ✅ All products exist
- ✅ Sufficient stock for all items
- ✅ Quantity > 0 for all items
- ✅ Price >= 0 for all items
- ✅ Shipping and billing addresses required
- ✅ Payment method required

**Stock Management:**
- Stock automatically deducted when order created
- Stock restored if order cancelled
- Real-time stock validation

**Activity Logging:**
- Records who created the order
- Logs customer details
- Tracks item count and total
- Maintains audit trail

---

## 🎯 Real-World Scenarios

### Scenario 1: Phone Order from Regular Customer

**Situation:** Customer calls to place order, wants special pricing

**Admin Actions:**
1. Go to `/admin/orders/create`
2. Search and select customer "ABC Trading"
3. Add products:
   - Product A × 50 units
   - Product B × 30 units
4. System auto-applies their custom pricing:
   - Product A: ৳850 (was ৳1000) - saved ৳150/unit
   - Product B: ৳450 (was ৳500) - saved ৳50/unit
5. Enter shipping address from phone
6. Set shipping: ৳200
7. Payment: Bank Transfer (NET 30)
8. Notes: "Delivery by Friday - spoke with Mr. Ahmed"
9. Create order
10. Send order confirmation to customer

**Result:**
- Order created with custom pricing
- Stock deducted automatically
- Customer gets negotiated prices
- Tracked in system

---

### Scenario 2: Special Negotiated Deal

**Situation:** New bulk customer negotiates one-time special pricing

**Admin Actions:**
1. Create manual order (no existing customer)
2. Add products with negotiated prices:
   - Product X × 100 @ ৳700 (standard ৳900)
   - Product Y × 200 @ ৳300 (standard ৳400)
3. Enter company details in addresses
4. Payment: 50% advance, 50% on delivery
5. Notes: "Special bulk deal - John approved"
6. Create order

**Optional Next Step:**
- If customer becomes regular, create customer-specific pricing:
  - `/api/admin/customers/{id}/pricing`
  - Save negotiated prices for future orders

---

### Scenario 3: Quote Follow-Up

**Situation:** Customer received quote, wants to order

**Admin Actions:**
1. Open quote/RFQ system
2. Review quoted prices
3. Create order with quoted prices:
   - Copy items from quote
   - Apply quoted prices as custom prices
   - Add customer details
4. Create order
5. Mark quote as "Converted to Order"

---

## 📊 Price Hierarchy Example

### Example Product: "Premium Widget"
- **Base Cost:** ৳600 (what platform pays)
- **Standard Wholesale:** ৳1,000 (regular customers)
- **Customer-Specific Pricing:** ৳850 (ABC Company)
- **Manual Order Override:** ৳800 (special negotiation)

### Order Scenarios:

#### Scenario A: Regular Order by ABC Company
```
Customer: ABC Company
Product: Premium Widget × 10
Applied Price: ৳850 (customer-specific pricing)
Total: ৳8,500
```

#### Scenario B: Admin Creates Order for ABC Company
```
Customer: ABC Company
Product: Premium Widget × 10
Applied Price: ৳850 (customer-specific pricing auto-applied)
Total: ৳8,500
```

#### Scenario C: Admin Creates Order with Override
```
Customer: ABC Company
Product: Premium Widget × 10
Custom Price: ৳800 (admin overrides to ৳800)
Total: ৳8,000
Note: "Special order - CEO approved discount"
```

#### Scenario D: Guest Order
```
Customer: None (guest)
Product: Premium Widget × 10
Applied Price: ৳1,000 (standard wholesale)
Total: ৳10,000
```

---

## 🔐 Security & Permissions

### Admin-Only Features
- Only ADMIN role can:
  - Create customer-specific pricing
  - View customer pricing
  - Create manual orders
  - Override prices
- Regular users cannot access these features

### Audit Trail
Every action is logged:
```javascript
{
  action: "CREATE",
  entityType: "CustomerPricing",
  performedBy: "admin@example.com",
  timestamp: "2026-01-05T12:00:00Z",
  details: {
    customerId: "user_123",
    productId: "product_456",
    oldPrice: null,
    newPrice: 850,
    reason: "VIP customer discount"
  }
}
```

---

## 🚀 Setup Instructions

### 1. Database Migration
```bash
# Add CustomerPricing model to schema
npx prisma generate
npx prisma db push
```

### 2. Access the Features

**Customer Pricing Management:**
- Go to customer profile
- View/Add custom pricing
- Set expiration dates

**Manual Order Creation:**
- Navigate to `/admin/orders/create`
- Search customer (optional)
- Add products
- Customize prices
- Create order

---

## 📈 Business Benefits

### For Admins:
- ✅ Flexible pricing for VIP customers
- ✅ Quick phone order entry
- ✅ Custom deal negotiations
- ✅ Override prices for special cases
- ✅ Complete order control

### For Customers:
- 🎁 Personalized pricing
- 📞 Can place orders via phone
- 💰 Better deals for loyalty
- 🤝 Negotiated contracts
- ⚡ Fast order processing

### For Business:
- 📊 Track custom pricing effectiveness
- 💼 Support B2B sales team
- 🎯 Flexible pricing strategy
- 📈 Retain key customers
- 🔍 Full audit trail

---

## 🎨 UI Screenshots Description

### Create Order Page:
```
┌──────────────────────────────────────────────┐
│ ← Back to Orders                              │
│ Create New Order                              │
│ Manually create an order with custom pricing │
├──────────────────────────────────────────────┤
│ Customer Selection (Optional)                 │
│ [Search customer...........................] │
│ 💡 Leave empty for guest orders              │
├──────────────────────────────────────────────┤
│ Order Items                                   │
│ [Search products to add....................]  │
│                                               │
│ Product A                        Stock: 100   │
│ Qty: [10] Price: [৳850] Total: ৳8,500       │
│ 🏷️ Custom price (Standard: ৳1,000)         │
│                                     [Remove]  │
├──────────────────────────────────────────────┤
│ Shipping Address                              │
│ [Enter full address........................] │
│                                               │
│ Billing Address      [Same as shipping]       │
│ [Enter billing address.....................] │
├──────────────────────────────────────────────┤
│ ORDER SUMMARY                                 │
│ Items (2)                      ৳8,500         │
│ Shipping                          ৳100        │
│ Tax                                 ৳0        │
│ ─────────────────────────────────────         │
│ Total                          ৳8,600         │
│                                               │
│ Payment Method: [Bank Transfer ▼]            │
│ Notes: [Internal notes....................]   │
│                                               │
│           [Create Order]                      │
└──────────────────────────────────────────────┘
```

---

## 🔄 Integration Points

### With Existing Systems:

**Order Management:**
- Manual orders appear in order list
- Same workflow as regular orders
- Can be edited, cancelled, fulfilled

**Inventory System:**
- Stock automatically deducted
- Low stock alerts apply
- Stock restored on cancellation

**Customer Management:**
- Pricing stored per customer
- Applied automatically in future
- Visible in customer profile

**Activity Logs:**
- All actions logged
- Admin attribution
- Timestamp tracking

---

## ✅ Testing Checklist

### Customer Pricing:
- [ ] Create customer-specific pricing
- [ ] Update existing pricing
- [ ] Set expiration dates
- [ ] Deactivate pricing
- [ ] Verify pricing applies to orders

### Manual Order Creation:
- [ ] Create order with customer
- [ ] Create guest order
- [ ] Add multiple products
- [ ] Edit quantities
- [ ] Override prices
- [ ] Apply custom pricing
- [ ] Check stock validation
- [ ] Verify total calculations
- [ ] Submit order
- [ ] Check stock deduction
- [ ] View in order list

---

## 📝 Best Practices

### Customer Pricing:
1. **Document Reasons**: Always add notes explaining why
2. **Set Expiration**: Use validUntil for promotions
3. **Review Regularly**: Audit pricing quarterly
4. **Communicate**: Inform customers of their pricing
5. **Track Performance**: Monitor if discounts improve sales

### Manual Orders:
1. **Verify Customer**: Confirm identity before creating
2. **Check Stock**: Ensure availability first
3. **Accurate Addresses**: Double-check delivery details
4. **Clear Notes**: Document special instructions
5. **Confirm with Customer**: Send order confirmation
6. **Payment Terms**: Clarify payment method

---

## 🎯 Summary

✅ **Fully Implemented:**
- Customer-specific pricing database model
- Pricing management APIs
- Manual order creation API
- Complete admin UI
- Automatic price application
- Stock management integration
- Activity logging
- Security and permissions

🚀 **Ready to Use:**
- Navigate to `/admin/orders/create`
- Start creating orders with custom pricing
- Manage customer-specific pricing
- Track all activities

📊 **Business Value:**
- Flexible pricing for key customers
- Phone order support
- Custom negotiations
- VIP customer retention
- Complete audit trail

---

**Last Updated:** January 5, 2026  
**Status:** ✅ Production Ready
