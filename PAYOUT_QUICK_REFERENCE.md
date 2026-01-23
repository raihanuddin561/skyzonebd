# Partner Payout Workflow - Quick Reference

## 🎯 Quick Start

### Generate Payout (Admin)
```bash
POST /api/admin/payouts/generate
{
  "partnerId": "partner_123",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "periodType": "MONTHLY"
}
```

### Mark as Paid (Admin)
```bash
PATCH /api/admin/payouts/{id}
{
  "status": "PAID",
  "paymentMethod": "Bank Transfer",
  "paymentReference": "TXN-001"
}
```

### View Payouts (Partner)
```bash
GET /api/partner/financial/distributions?status=APPROVED
```

---

## 📊 Payout Calculation

```
Net Profit = Revenue - COGS - OpCosts - Returns - Tax
Payout = Net Profit × (Partner Share % / 100)
```

### Example
- Revenue: ৳2,225,000
- COGS: ৳1,400,000
- Op Costs: ৳250,000
- Returns: ৳75,000
- Tax: ৳333,750
- **Net Profit: ৳166,250**
- Partner Share: 25%
- **Payout: ৳41,562.50**

---

## 🔄 Status Flow

```
PENDING → APPROVED → PAID
```

| Status | Can Transition To | Who Can Change |
|--------|------------------|----------------|
| PENDING | APPROVED, REJECTED | Admin |
| APPROVED | PAID | Admin |
| PAID | (Final) | None |
| REJECTED | (Can delete) | Admin |

---

## 🎨 UI Routes

### Admin
- **List:** `/admin/payouts`
- **Generate:** Click "Generate Payout" button
- **Update:** Click "Mark Paid" or "View Details"

### Partner
- **List:** `/partner/payouts`
- **Details:** Click "View Details"

---

## 🧩 Components

### PayoutStatusBadge
```tsx
import PayoutStatusBadge from '@/components/payouts/PayoutStatusBadge';

<PayoutStatusBadge status="PAID" />
```

### PayoutTable
```tsx
import PayoutTable from '@/components/payouts/PayoutTable';

<PayoutTable 
  payouts={payouts}
  isAdmin={true}
  onStatusChange={handleStatusChange}
/>
```

### GeneratePayoutModal
```tsx
import GeneratePayoutModal from '@/components/payouts/GeneratePayoutModal';

<GeneratePayoutModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onGenerate={handleGeneratePayout}
  partners={partners}
/>
```

---

## 📋 API Endpoints

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/payouts/generate` | Generate new payout |
| GET | `/api/admin/payouts/{id}` | Get payout details |
| PATCH | `/api/admin/payouts/{id}` | Update payout status |
| DELETE | `/api/admin/payouts/{id}` | Delete unpaid payout |
| GET | `/api/admin/financial/outstanding-payouts` | List all payouts |

### Partner Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partner/financial/distributions` | View payout history |

---

## ✅ Validation Rules

### Generate Payout
- ✓ Partner must exist and be active
- ✓ Start date < End date
- ✓ No duplicate for same period
- ✓ Negative profit sets payout to 0

### Update Status
- ✓ Valid status transition
- ✓ Payment details for PAID status
- ✓ Cannot modify PAID status

### Delete
- ✓ Only PENDING or REJECTED
- ✓ Cannot delete PAID

---

## 💡 Common Tasks

### Monthly Payout Process
1. Generate payout (1st of month)
2. Review calculations
3. Approve payout
4. Process payment
5. Mark as paid with reference

### Check Outstanding
```bash
GET /api/admin/financial/outstanding-payouts?status=APPROVED
```

### Check Overdue
```bash
GET /api/admin/financial/outstanding-payouts?overdue=true
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Calculation incorrect | Verify order.profit and costPrice values |
| Cannot mark paid | Status must be APPROVED first |
| Duplicate error | Check existing payouts for period |
| Partner can't see | Verify partnerId and status |

---

## 📦 Files Structure

```
src/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── payouts/
│   │           ├── generate/route.ts
│   │           └── [id]/route.ts
│   ├── admin/
│   │   └── payouts/page.tsx
│   └── partner/
│       └── payouts/page.tsx
└── components/
    └── payouts/
        ├── PayoutStatusBadge.tsx
        ├── PayoutTable.tsx
        └── GeneratePayoutModal.tsx
```

---

## 📈 Key Metrics

Monitor these:
- Pending approval time: Target <7 days
- Approval to paid time: Target <3 days
- Outstanding amount: Monitor trends
- Calculation accuracy: 100%

---

## 🔐 Security

- Admin only: Generate, approve, mark paid
- Partner view only: Cannot modify
- Auth required: All endpoints
- Audit trail: approvedBy, paidAt tracked

---

**Full Documentation:** [PARTNER_PAYOUT_WORKFLOW.md](PARTNER_PAYOUT_WORKFLOW.md)
