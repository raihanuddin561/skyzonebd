# Manual Payment Flow - Quick Reference

## 🎯 Quick Start

### For Merchants: Update Your Payment Details

**File:** `src/app/checkout/page.tsx`

**bKash Details (Line ~408):**
```tsx
Merchant Number: 01712-345678  // ← CHANGE THIS
Account Name: SkyzoneBD         // ← CHANGE THIS
```

**Bank Details (Line ~450):**
```tsx
Bank Name: Dutch Bangla Bank    // ← CHANGE THIS
Account Name: SkyzoneBD Ltd.    // ← CHANGE THIS
Account Number: 1234567890      // ← CHANGE THIS
Routing Number: 090260724       // ← CHANGE THIS
Branch: Gulshan, Dhaka          // ← CHANGE THIS
```

---

## 🛒 Customer Journey

```
1. Add items to cart
   ↓
2. Go to checkout
   ↓
3. Select bKash or Bank Transfer
   ↓
4. See payment instructions & make payment outside site
   ↓
5. Enter Transaction ID/Reference (required, min 5 chars)
   ↓
6. Place order → Status: PENDING_VERIFICATION
   ↓
7. Wait for admin to verify payment
```

---

## 👨‍💼 Admin Verification Steps

```
1. Dashboard → See "Payment Verification" card (orange)
   ↓
2. Click order → See payment verification section
   ↓
3. Check transaction ID in your bKash/bank account
   ↓
4. If Valid: Click "✓ Verify & Mark as PAID"
   If Invalid: Click "✗ Reject Payment" (+ add reason)
   ↓
5. Done! Order status auto-updates
```

---

## 🔑 Key API Endpoints

### Verify Payment
```http
PATCH /api/admin/orders/[id]/verify-payment
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "PAID" | "FAILED",
  "note": "Optional note or required rejection reason"
}
```

### Create Order (with manual payment)
```http
POST /api/orders
Content-Type: application/json

{
  "items": [...],
  "paymentMethod": "bkash" | "bank_transfer",
  "paymentReference": "TRANSACTION_ID_HERE", // Required!
  ...
}
```

---

## 🎨 Payment Status Colors

| Status | Color | Badge |
|--------|-------|-------|
| PENDING | Yellow | 🟡 |
| PENDING_VERIFICATION | Orange | 🟠 ⚠️ |
| PAID | Green | 🟢 ✓ |
| FAILED | Red | 🔴 ✗ |
| PARTIAL | Blue | 🔵 |
| REFUNDED | Gray | ⚪ |

---

## 📊 Database Fields

### New Order Fields
```typescript
paymentReference: string | null     // Transaction ID
paymentProofUrl: string | null      // Screenshot (future)
paymentVerifiedAt: DateTime | null  // When verified
paymentVerifiedBy: string | null    // Admin ID
paymentNotes: string | null         // Admin notes
```

### Payment Status Enum
```typescript
enum PaymentStatus {
  PENDING,
  PENDING_VERIFICATION,  // ← NEW
  PAID,
  PARTIAL,
  FAILED,
  REFUNDED
}
```

---

## ⚡ Quick Filters (Admin Orders Page)

- **All Payments** - Show everything
- **⚠️ Pending Verification** - Show orders needing attention
- **Paid** - Confirmed payments
- **Pending** - No payment yet
- **Failed** - Rejected payments

---

## 🚨 Validation Rules

1. **Transaction ID Required** for bKash/Bank Transfer
2. **Minimum Length:** 5 characters
3. **Cannot submit** without TrxID
4. **Rejection must include** reason/note

---

## 🔒 Security

- ✅ Admin-only verification endpoint
- ✅ Role-based access (ADMIN/SUPER_ADMIN)
- ✅ Server-side validation
- ✅ Activity logging for all actions
- ✅ Token-based authentication

---

## 📝 Activity Logs

All actions are logged:
- Customer submits payment
- Admin verifies/rejects payment
- Status changes
- Notes added

**View logs in:** Database → `ActivityLog` table

---

## 🎯 Common Tasks

### Update Payment Details
→ Edit `src/app/checkout/page.tsx` (lines 408 & 450)

### Find Pending Verifications
→ Admin Orders → Filter: "⚠️ Pending Verification"

### Check Verification History
→ Order Details → "Payment Notes" section

### View Activity Logs
→ Database → `ActivityLog` WHERE `entityType = 'Order'`

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| TrxID field not showing | Check payment method is lowercase 'bkash' or 'bank_transfer' |
| Can't verify payment | Ensure logged in as ADMIN/SUPER_ADMIN |
| Order not updating | Check browser console & network tab |
| Stats not updating | Refresh page or clear cache |

---

## 📞 Need Help?

1. Check main documentation: `MANUAL_PAYMENT_FLOW_IMPLEMENTATION.md`
2. Review activity logs for errors
3. Check browser console for client errors
4. Verify API responses in network tab

---

**Last Updated:** January 24, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
