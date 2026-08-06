# Payment Configuration Quick Reference

## 🎯 Quick Start

### Admin: Add Payment Method
1. Go to `/admin/payment-settings`
2. Click "Add Payment Method"
3. Fill form and click "Create"

### Customer: See Payment Options
- Payment details automatically load on checkout
- Only active methods show up
- Instructions appear when method selected

---

## 📋 Common Tasks

### Add bKash Account
```json
{
  "type": "BKASH",
  "name": "bKash Merchant Account",
  "accountNumber": "01712-345678",
  "accountName": "SkyzoneBD",
  "accountType": "Merchant",
  "isActive": true,
  "priority": 0
}
```

### Add Bank Account
```json
{
  "type": "BANK_TRANSFER",
  "name": "Dutch Bangla Bank",
  "bankName": "Dutch Bangla Bank",
  "accountName": "SkyzoneBD Ltd.",
  "accountNumber": "1234567890",
  "routingNumber": "090260724",
  "branchName": "Gulshan, Dhaka",
  "isActive": true,
  "priority": 10
}
```

---

## 🔧 API Quick Reference

### Public Endpoint (No Auth)
```bash
GET /api/payment-config
# Returns only active configs
```

### Admin Endpoints (Auth Required)
```bash
GET    /api/admin/payment-config      # List all
POST   /api/admin/payment-config      # Create new
GET    /api/admin/payment-config/:id  # Get one
PATCH  /api/admin/payment-config/:id  # Update
DELETE /api/admin/payment-config/:id  # Delete
```

---

## 🎨 Payment Types

| Type | Value | Fields Needed |
|------|-------|---------------|
| bKash | `BKASH` | accountNumber, accountName, accountType |
| Nagad | `NAGAD` | accountNumber, accountName, accountType |
| Rocket | `ROCKET` | accountNumber, accountName, accountType |
| Bank | `BANK_TRANSFER` | bankName, accountName, accountNumber, routingNumber, branchName |
| Credit Card | `CREDIT_CARD` | (Future implementation) |

---

## 🔐 Permissions

- **View**: ADMIN, SUPER_ADMIN
- **Create**: ADMIN, SUPER_ADMIN
- **Edit**: ADMIN, SUPER_ADMIN
- **Delete**: ADMIN, SUPER_ADMIN

---

## 📁 Files Modified

### Database
- `prisma/schema.prisma` - Added PaymentConfig model
- Migration: `add_payment_config`

### Backend APIs
- `/api/payment-config/route.ts` - Public endpoint
- `/api/admin/payment-config/route.ts` - List & Create
- `/api/admin/payment-config/[id]/route.ts` - Get, Update, Delete

### Frontend
- `/admin/payment-settings/page.tsx` - Admin UI
- `/checkout/page.tsx` - Updated to use dynamic data

---

## ⚠️ Important Notes

1. **Priority**: Lower numbers = shown first (0, 10, 20, ...)
2. **Active Status**: Only `isActive: true` shows to customers
3. **Type Match**: Payment type must match exactly (case-sensitive)
4. **Required Fields**: type, name are mandatory
5. **Activity Logging**: All changes are logged automatically

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Payment not showing | Check `isActive: true` |
| Wrong order | Adjust `priority` values |
| Can't access admin page | Verify ADMIN/SUPER_ADMIN role |
| Changes not visible | Hard refresh (Ctrl+Shift+R) |

---

## 📱 Example Customer Flow

1. Customer goes to checkout
2. Selects "bKash" payment method
3. Page shows:
   - Account number from database
   - Account name from database
   - Custom instructions (if any)
4. Customer enters transaction ID
5. Order created with `PENDING_VERIFICATION` status
6. Admin verifies payment later

---

## 🚀 Next Steps

After creating payment configs:
1. Verify they appear on checkout page
2. Test placing an order with each method
3. Verify transaction ID validation works
4. Check admin can verify payments

---

**Need Help?** See full guide: `ADMIN_PAYMENT_CONFIG_GUIDE.md`
