# Financial API Quick Reference

## 🎯 Partner Endpoints

### P&L Statement
```
GET /api/partner/financial/profit-loss?period=thisMonth&format=summary
```
**Returns:** Revenue, costs, profit, partner share, distributions

### Sales Summary
```
GET /api/partner/financial/sales-summary?groupBy=day&period=last30days
```
**Returns:** Daily/weekly/monthly sales breakdown with trends

### Distribution History
```
GET /api/partner/financial/distributions?status=APPROVED&page=1
```
**Returns:** Payout history with status filtering

### Top Products
```
GET /api/partner/financial/top-products?sortBy=profit&limit=10
```
**Returns:** Best performing products by profit/revenue/units

### Dashboard
```
GET /api/partner/financial/dashboard?period=thisMonth
```
**Returns:** Consolidated overview with key metrics

---

## 👨‍💼 Admin Endpoints

### Platform P&L
```
GET /api/admin/financial/profit-loss?period=thisMonth&format=detailed
```
**Returns:** Complete platform financial statement

### Partner Comparison
```
GET /api/admin/financial/partner-comparison?sortBy=revenue&page=1
```
**Returns:** Compare all partners' performance

### Outstanding Payouts
```
GET /api/admin/financial/outstanding-payouts?overdue=true
```
**Returns:** Unpaid distributions with urgency tracking

### Revenue Analytics
```
GET /api/admin/financial/revenue-analytics?groupBy=week&forecast=true
```
**Returns:** Revenue trends + forecasting

### Cost Breakdown
```
GET /api/admin/financial/cost-breakdown?category=MARKETING&groupBy=month
```
**Returns:** COGS + operational cost analysis

---

## 📅 Period Options

| Period | Description |
|--------|-------------|
| `today` | Today's data |
| `yesterday` | Yesterday's data |
| `last7days` | Last 7 days |
| `last30days` | Last 30 days |
| `thisMonth` | Current month |
| `lastMonth` | Previous month |
| `thisYear` | Current year |
| `custom` | Use startDate & endDate |

---

## 🔢 Pagination

All list endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

Response includes:
```json
{
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 📊 Common Filters

### Date Range
- `period` - Preset period
- `startDate` - ISO 8601 date (e.g., 2026-01-01)
- `endDate` - ISO 8601 date

### Sorting
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc`

### Grouping
- `groupBy` - `day`, `week`, or `month`

### Status
- `status` - Filter by status (e.g., PENDING, APPROVED, PAID)

---

## 💰 Currency Format

All monetary values include:
- Raw number: `"revenue": 225000`
- Formatted: `"revenueFormatted": "৳225,000"`

---

## 🔐 Authentication

**Partner Endpoints:** Require partner authentication token  
**Admin Endpoints:** Require admin authentication token

Include in request header:
```
Authorization: Bearer <your_token>
```

---

## ⚡ Performance Tips

1. Use indexes: Queries are optimized for `status`, `createdAt`, `productId`
2. Limit date ranges: Max 1 year to prevent slow queries
3. Use pagination: Don't fetch all records at once
4. Cache results: Consider caching for frequently accessed reports
5. Use `summary` format: For quick overviews instead of `detailed`

---

## 🚨 Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (invalid/missing token) |
| 404 | Resource not found |
| 500 | Server error |

---

## 📈 Metrics Explained

| Metric | Formula |
|--------|---------|
| **Gross Profit** | Revenue - COGS |
| **Operating Profit** | Gross Profit - Operational Costs |
| **Net Profit** | Operating Profit - Distributions |
| **Gross Margin** | (Gross Profit / Revenue) × 100 |
| **Net Margin** | (Net Profit / Revenue) × 100 |
| **AOV** | Total Revenue / Order Count |
| **Partner Share** | Profit × (profitSharePercentage / 100) |

---

## 🎯 Use Cases

### Partner: Check Monthly Earnings
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.skyzonebd.com/api/partner/financial/dashboard?period=thisMonth"
```

### Admin: Identify Top Revenue Partners
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.skyzonebd.com/api/admin/financial/partner-comparison?sortBy=revenue&limit=10"
```

### Admin: Find Overdue Payments
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.skyzonebd.com/api/admin/financial/outstanding-payouts?overdue=true"
```

---

## 📚 Related Files

- **Implementation Plan:** `FINANCIAL_STATEMENTS_IMPLEMENTATION_PLAN.md`
- **Complete Docs:** `FINANCIAL_STATEMENTS_API_COMPLETE.md`
- **Utilities:** `src/lib/financialCalculator.ts`, `src/lib/paginationHelper.ts`
- **Schema:** `prisma/schema.prisma`

---

**Quick Start:** Start with the dashboard endpoint, then drill down into specific reports as needed.
