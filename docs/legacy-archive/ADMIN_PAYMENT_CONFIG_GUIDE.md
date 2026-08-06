# Admin Payment Configuration System

## Overview
This guide explains how administrators can configure and manage payment methods (bKash, Bank Transfer, Nagad, etc.) through the admin panel. Payment information is now dynamic and database-driven instead of hardcoded.

---

## Features

### ✅ What's Included
- **Dynamic Payment Configuration**: Add, edit, and delete payment methods
- **Multiple Account Support**: Configure multiple accounts for each payment type
- **Priority Ordering**: Control the display order of payment methods
- **Active/Inactive Toggle**: Enable or disable payment methods without deleting them
- **Type-Specific Fields**: Different fields for mobile banking vs. bank transfer
- **Customer Instructions**: Add custom payment instructions for each method
- **Public API**: Secure endpoint for customers to view active payment methods only

---

## Database Schema

### PaymentConfig Model
```prisma
model PaymentConfig {
  id             String   @id @default(cuid())
  type           String   // BKASH, NAGAD, ROCKET, BANK_TRANSFER, CREDIT_CARD
  name           String   // Display name (e.g., "bKash Merchant Account")
  isActive       Boolean  @default(true)
  priority       Int      @default(0)
  
  // Mobile Banking Fields
  accountNumber  String?  // Mobile number or bank account number
  accountName    String?  // Account holder name
  accountType    String?  // Personal, Merchant, Agent (for mobile banking)
  
  // Bank Transfer Fields
  bankName       String?  // Bank name
  branchName     String?  // Branch location
  routingNumber  String?  // Bank routing number
  
  // Additional
  instructions   String?  @db.Text  // Custom instructions for customers
  logoUrl        String?  // Optional logo for payment method
  
  createdBy      String?  // Admin who created this config
  updatedBy      String?  // Admin who last updated
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([type, isActive])
  @@index([priority])
}
```

---

## Admin Panel Usage

### Accessing Payment Settings
1. Log in as **Admin** or **Super Admin**
2. Navigate to **Admin Panel** → **Payment Settings**
3. URL: `/admin/payment-settings`

### Adding a New Payment Method

#### For bKash / Mobile Banking
1. Click **"Add Payment Method"** button
2. Fill in the form:
   - **Payment Type**: Select "bKash" (or Nagad/Rocket)
   - **Display Name**: e.g., "bKash Merchant Account"
   - **Mobile Number**: e.g., "01712-345678"
   - **Account Name**: e.g., "SkyzoneBD"
   - **Account Type**: Select "Merchant" (or Personal/Agent)
   - **Customer Instructions**: Optional step-by-step guide
   - **Display Priority**: 0 = shows first
   - **Status**: Check "Active" to make visible to customers
3. Click **"Create"**

#### For Bank Transfer
1. Click **"Add Payment Method"** button
2. Fill in the form:
   - **Payment Type**: Select "Bank Transfer"
   - **Display Name**: e.g., "Dutch Bangla Bank - Business Account"
   - **Bank Name**: e.g., "Dutch Bangla Bank"
   - **Account Name**: e.g., "SkyzoneBD Ltd."
   - **Account Number**: e.g., "1234567890"
   - **Routing Number**: e.g., "090260724" (optional)
   - **Branch Name**: e.g., "Gulshan, Dhaka" (optional)
   - **Customer Instructions**: Optional additional info
   - **Display Priority**: 0 = shows first
   - **Status**: Check "Active"
3. Click **"Create"**

### Editing a Payment Method
1. Find the payment card in the grid
2. Click **"✏️ Edit"** button
3. Modify any fields (except Payment Type)
4. Click **"Update"**

### Deleting a Payment Method
1. Find the payment card in the grid
2. Click **"🗑️ Delete"** button
3. Confirm deletion in the popup

### Deactivating Without Deleting
1. Click **"✏️ Edit"** on the payment method
2. Uncheck **"Active (visible to customers)"**
3. Click **"Update"**

---

## API Endpoints

### Admin Endpoints (Require Authentication)

#### 1. List All Payment Configurations
```http
GET /api/admin/payment-config
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxy123abc",
      "type": "BKASH",
      "name": "bKash Merchant Account",
      "isActive": true,
      "priority": 0,
      "accountNumber": "01712-345678",
      "accountName": "SkyzoneBD",
      "accountType": "Merchant",
      "instructions": "Send money to our merchant account...",
      "createdAt": "2025-01-24T10:00:00Z",
      "updatedAt": "2025-01-24T10:00:00Z"
    }
  ]
}
```

#### 2. Create Payment Configuration
```http
POST /api/admin/payment-config
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "type": "BKASH",
  "name": "bKash Merchant Account",
  "isActive": true,
  "priority": 0,
  "accountNumber": "01712-345678",
  "accountName": "SkyzoneBD",
  "accountType": "Merchant",
  "instructions": "Optional custom instructions"
}
```

#### 3. Get Single Configuration
```http
GET /api/admin/payment-config/{id}
Authorization: Bearer <admin_token>
```

#### 4. Update Configuration
```http
PATCH /api/admin/payment-config/{id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "accountNumber": "01812-999888",
  "isActive": false
}
```

#### 5. Delete Configuration
```http
DELETE /api/admin/payment-config/{id}
Authorization: Bearer <admin_token>
```

### Public Endpoint (No Authentication)

#### Get Active Payment Methods
```http
GET /api/payment-config
```

**Response:** Returns only `isActive: true` configurations with limited fields
```json
{
  "success": true,
  "data": [
    {
      "id": "clxy123abc",
      "type": "BKASH",
      "name": "bKash Merchant Account",
      "accountNumber": "01712-345678",
      "accountName": "SkyzoneBD",
      "accountType": "Merchant",
      "instructions": "Send money instructions...",
      "priority": 0
    }
  ]
}
```

---

## Customer Experience

### Checkout Page Integration
When customers select a payment method during checkout:

1. **Dynamic Loading**: Payment details are fetched from `/api/payment-config`
2. **Real-time Display**: Information shows automatically based on admin configuration
3. **Fallback Handling**: If no configuration exists, shows "Please contact support"

#### Example for bKash:
- Shows account number from database
- Displays account name configured by admin
- Shows account type (Merchant/Personal/Agent)
- Includes custom instructions if provided

#### Example for Bank Transfer:
- Shows bank name, account name, account number
- Displays routing number and branch if provided
- Includes any custom transfer instructions

---

## Best Practices

### Security
- ✅ Only **Admin** and **Super Admin** roles can access payment settings
- ✅ All changes are logged in the activity system
- ✅ Public API only returns active configurations
- ✅ Sensitive admin metadata (createdBy, updatedBy) not exposed publicly

### Configuration Tips
1. **Priority Numbers**: 
   - Use 0 for primary payment method
   - Increment by 10 (0, 10, 20) to allow easy reordering
   
2. **Multiple Accounts**:
   - Create separate configs for different bKash accounts
   - Example: "bKash Merchant - Main" (priority 0) and "bKash Merchant - Backup" (priority 10)

3. **Instructions Field**:
   - Keep instructions clear and concise
   - Use numbered steps for complex processes
   - Mention important details (fees, timing, etc.)

4. **Testing**:
   - Create a test config with `isActive: false` first
   - Verify display on checkout page
   - Activate when confirmed correct

---

## Migration from Hardcoded Values

### Before (Hardcoded in checkout page):
```tsx
// ❌ Old approach - hardcoded
<p>Merchant Number: 01712-345678</p>
<p>Bank Name: Dutch Bangla Bank</p>
```

### After (Database-driven):
```tsx
// ✅ New approach - dynamic from database
const bkashConfig = paymentConfigs.find(c => c.type === 'BKASH');
<p>Account Number: {bkashConfig?.accountNumber}</p>
```

### Migration Steps:
1. ✅ PaymentConfig model added to Prisma schema
2. ✅ Database migration created and applied
3. ✅ Admin API endpoints created
4. ✅ Admin UI page built at `/admin/payment-settings`
5. ✅ Public API endpoint created at `/api/payment-config`
6. ✅ Checkout page updated to fetch dynamic data
7. **Next**: Admin adds initial payment configurations

---

## Troubleshooting

### Issue: Payment details not showing on checkout
**Solution**: 
1. Check if payment config is marked as `isActive: true`
2. Verify payment type matches (e.g., "BKASH" in database vs "bkash" in checkout)
3. Check browser console for API errors

### Issue: Can't access /admin/payment-settings
**Solution**: 
1. Ensure logged in as Admin or Super Admin
2. Check JWT token is valid
3. Verify role permissions in database

### Issue: Changes not reflecting immediately
**Solution**: 
1. Hard refresh the checkout page (Ctrl+Shift+R)
2. Check if API is returning updated data
3. Verify database update was successful

---

## Activity Logging

All payment configuration changes are logged:

- **Create**: `"Created payment configuration: bKash Merchant Account (BKASH)"`
- **Update**: `"Updated payment configuration: Dutch Bangla Bank (BANK_TRANSFER)"`
- **Delete**: `"Deleted payment configuration: Old Account (NAGAD)"`

Logs include:
- Admin user who made the change
- Timestamp
- Configuration details

---

## Future Enhancements

Potential improvements:
- [ ] Upload logos for each payment method
- [ ] QR code generation for mobile payments
- [ ] Payment method availability by business type (B2B vs B2C)
- [ ] Automatic selection based on customer location
- [ ] Integration with payment gateway APIs
- [ ] Transaction fee configuration per method

---

## Support

For questions or issues:
1. Check this documentation
2. Review activity logs for recent changes
3. Contact technical support with error details
4. Provide payment config ID for specific issues

---

**Last Updated**: January 2025  
**Version**: 1.0
