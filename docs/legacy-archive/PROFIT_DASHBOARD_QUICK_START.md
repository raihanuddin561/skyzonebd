# 🚀 Quick Start: Profit Dashboard & Admin Profile

## Access URLs

- **Admin Profile:** `http://localhost:3000/admin/profile`
- **Profit Dashboard:** `http://localhost:3000/admin/profit-dashboard`

---

## Admin Profile Features

### Edit Profile
1. Click "Edit Profile" button
2. Update: Name, Email, Phone, Company Name
3. Click "Save Changes"

### Change Password
1. Click "Change Password" button
2. Enter current password
3. Enter new password (min 6 chars)
4. Confirm new password
5. Click "Change Password"

---

## Profit Dashboard Quick Guide

### View Statistics (Top Cards)
- **Total Revenue** - All sales revenue (current month)
- **Total Costs** - COGS + Operational + Salaries
- **Net Profit** - Revenue - Costs (with margin %)
- **Active Partners** - Number of partners + total share %

### Add New Partner
1. Click "+ Add Partner"
2. Fill form:
   - Name *
   - Profit Share % * (system shows available %)
   - Partner Type (Investor, Co-Owner, etc.)
   - Optional: Email, Phone, Investment, Tax ID, Bank Account
3. Click "Create Partner"

### Edit Partner
1. Click "Edit" on partner row
2. Modify information
3. Click "Update Partner"

### Activate/Deactivate Partner
- Click "Activate" or "Deactivate" button
- Inactive partners don't receive distributions

### View Profit Distribution
Scroll to bottom section:
- Net Profit total
- Each partner's calculated distribution
- Remaining profit for business

---

## Profit Calculation Formula

```
Revenue = All Sales (Direct + Order-based)
COGS = Cost Price × Quantity for all products sold
Operational Costs = Rent + Utilities + Marketing + etc.
Salaries = All employee salaries

Net Profit = Revenue - (COGS + Operational Costs + Salaries)

For each active partner:
  Distribution = Net Profit × (Partner Share % / 100)

Remaining Profit = Net Profit - Total Distributions
```

---

## Important Rules

### Partnership Rules:
✅ Total active partner shares cannot exceed 100%  
✅ Individual share: 0-100%  
✅ Partners with distributions cannot be deleted  
✅ Only active partners receive profit  

### Cost Categories:
- COGS (Cost of Goods Sold)
- Salaries
- Rent
- Utilities
- Marketing
- Shipping
- And 15+ more categories

---

## API Endpoints

### Admin Profile
```
GET    /api/user/profile          - Get profile
PUT    /api/user/profile          - Update profile
PUT    /api/user/profile/password - Change password
```

### Partners
```
GET    /api/admin/partners       - Get all partners
POST   /api/admin/partners       - Create partner
PUT    /api/admin/partners/:id   - Update partner
PATCH  /api/admin/partners/:id   - Toggle active status
DELETE /api/admin/partners/:id   - Delete partner
```

### Dashboard
```
GET    /api/admin/profit-reports/dashboard - Get dashboard data
```

---

## Example: Add 30% Partner

```json
{
  "name": "John Investment Corp",
  "email": "john@invest.com",
  "phone": "+8801712345678",
  "profitSharePercentage": 30,
  "partnerType": "INVESTOR",
  "initialInvestment": 1000000,
  "bankAccount": "1234567890",
  "notes": "Silent partner, quarterly distributions"
}
```

If Net Profit = BDT 600,000:
- John receives: BDT 180,000 (30%)
- Business retains: BDT 420,000 (70%)

---

## Troubleshooting

### "Total share exceeds 100%"
- Check active partners
- Deactivate or reduce percentages
- System shows available share

### Partner won't delete
- Has profit distributions
- Deactivate instead of delete

### Statistics not updating
- Refresh page
- Check date range (current month only)

---

## Best Practices

1. **Monthly Review**: Check dashboard at month-end
2. **Cost Tracking**: Enter all costs promptly
3. **Partner Audit**: Review distributions quarterly
4. **Backup Data**: Regular database backups
5. **Document Changes**: Use notes field for partners

---

## Support

For issues or questions:
- Check [ADMIN_PROFIT_DASHBOARD_IMPLEMENTATION.md](ADMIN_PROFIT_DASHBOARD_IMPLEMENTATION.md)
- Review API documentation
- Check browser console for errors
