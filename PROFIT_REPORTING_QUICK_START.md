# Profit Reporting - Quick Start Guide

## For Administrators

### Accessing Profit Reports

#### 1. Profit Dashboard
**URL:** `/admin/profit-dashboard`

**What you'll see:**
- Total revenue, costs, and net profit for current month
- Active partners and their profit shares
- 6-month revenue and profit trends
- Top 10 most profitable products

**Actions you can take:**
- Add new partners
- Edit partner profit share percentages
- Activate/deactivate partners
- View profit distribution

#### 2. Profit Reports
**URL:** `/admin/profit-reports`

**What you'll see:**
- Detailed profit reports for all delivered orders
- Filters to find specific reports
- Summary statistics for selected period
- Platform vs seller profit breakdown

**How to use filters:**
1. Select period (daily/weekly/monthly/yearly)
2. Choose date range (optional)
3. Enter product ID to see reports for specific product
4. Enter seller ID to see reports for specific seller
5. Click "Clear All" to reset filters

**Understanding the data:**
- **Revenue:** Total amount customer paid
- **Cost:** Cost of goods sold (COGS)
- **Net Profit:** Revenue minus all costs
- **Platform Profit:** Your platform's share
- **Seller Profit:** Seller's commission
- **Profit Margin:** Net profit as percentage of revenue

#### 3. Profit & Loss Report
**URL:** `/admin/profit-loss`

**Permission Required:** `PROFIT_LOSS_VIEW`

**Report Types:**

**Monthly Report:**
- Select month and year
- Click "Generate Report"
- View revenue breakdown (direct vs order-based sales)
- See costs by category (inventory, salaries, operations)
- Review net profit and margin

**Trend Report:**
- Select year
- Click "Trend" button
- View 12-month comparison
- See revenue, costs, and profit trends
- Identify seasonal patterns

**Year-to-Date Report:**
- Select year
- Click "Year-to-Date" button
- View cumulative totals
- Compare with monthly breakdown
- Track annual progress

---

## How Automatic Reports Work

### When Reports Are Generated

Reports are **automatically created** when:
1. An order status changes to **DELIVERED**
2. The system hasn't already created a report for that order

### What Gets Calculated

For each delivered order:
- **Revenue:** Total order amount
- **Cost of Goods:** Sum of product costs × quantities
- **Gross Profit:** Revenue - Cost of Goods
- **Platform Profit:** Based on product's platform profit percentage
- **Seller Profit:** Based on product's seller commission percentage
- **Net Profit:** Gross profit after all distributions

### Important Notes

✅ **Uses historical prices:** The system uses the prices that were active when the order was created, not current prices

✅ **Idempotent:** If you try to generate a report for the same order twice, the second attempt will be skipped

✅ **No manual action needed:** You don't need to do anything - reports generate automatically

---

## Common Tasks

### View Today's Profit

1. Go to `/admin/profit-reports`
2. Set Start Date to today
3. Set End Date to today
4. Period: Daily
5. View summary cards at the top

### Find Most Profitable Products

1. Go to `/admin/profit-dashboard`
2. Scroll to "Top 10 Products by Net Profit"
3. View ranked list with profit amounts and margins

### Check Monthly Performance

1. Go to `/admin/profit-loss`
2. Select current month and year
3. Click "Generate Report"
4. Review revenue, costs, and net profit
5. Check profit margin percentage

### Add Business Partner

1. Go to `/admin/profit-dashboard`
2. Click "+ Add Partner"
3. Fill in partner details:
   - Name (required)
   - Email
   - Phone
   - **Profit Share Percentage** (required)
   - Partner Type
   - Initial Investment
   - Bank Account
4. Check available share percentage
5. Click "Create Partner"
6. Partner will now receive their share of profits

### Review Partner Distributions

1. Go to `/admin/profit-dashboard`
2. Scroll to "Partnership Management"
3. View table showing:
   - Partner name
   - Profit share percentage
   - Projected share (based on current month's profit)
   - Total received to date
   - Active status
4. See remaining profit after all distributions

---

## Understanding Your Numbers

### Revenue Metrics

**Total Revenue:** Sum of all customer payments for delivered orders

**Revenue Growth:** Percentage change compared to previous period

**Average Order Value:** Total revenue ÷ number of orders

### Cost Metrics

**Total Costs:** Sum of:
- Cost of Goods Sold (COGS)
- Operational expenses
- Salaries
- Marketing expenses
- Other business costs

**Cost Growth:** Percentage change compared to previous period

### Profit Metrics

**Gross Profit:** Revenue - COGS

**Net Profit:** Revenue - All Costs

**Profit Margin:** (Net Profit ÷ Revenue) × 100

**Platform Profit:** Your platform's share after seller commission

**Seller Profit:** Total paid to sellers as commission

### Distribution Metrics

**Total Partner Share:** Sum of all active partners' percentages

**Partner Distribution:** (Net Profit × Partner Share %) for each partner

**Remaining Profit:** Net Profit - Total Partner Distribution

---

## Troubleshooting

### "Access Denied" on P&L Page

**Problem:** You don't have permission to view Profit & Loss reports

**Solution:** Contact a Super Admin to grant you `PROFIT_LOSS_VIEW` permission

### No Reports Showing

**Possible Causes:**
1. No orders have been delivered yet
2. Date filters are too restrictive
3. All orders are still in processing/shipped status

**Solution:**
- Clear all filters and try again
- Check if any orders have status "DELIVERED"
- Verify date range includes recent deliveries

### Reports Not Generating Automatically

**Check:**
1. Order status must be exactly "DELIVERED"
2. Check server logs for errors
3. Verify database connection is stable

**Manual Generation:**
- Reports will generate automatically when next order is delivered
- Cannot manually generate reports (automatic only)

### Dashboard Shows Zero

**Possible Causes:**
1. No financial data exists yet (new system)
2. Viewing wrong time period
3. Database query issue

**Solution:**
- Wait for some orders to be delivered
- Check that Sales, Costs, and Orders exist in database
- Contact technical support if issue persists

---

## Best Practices

### Daily
- Check dashboard for today's performance
- Monitor new profit reports as orders deliver
- Review any unusual profit margins

### Weekly
- Review profit reports with weekly filter
- Compare with previous week
- Identify trending products

### Monthly
- Generate P&L monthly report
- Review all cost categories
- Calculate partner distributions
- Compare with monthly targets

### Quarterly
- Generate trend reports for 3-month view
- Review top products performance
- Assess partner profitability
- Plan budget adjustments

---

## Key Shortcuts

| Page | URL Path |
|------|----------|
| Dashboard | `/admin/profit-dashboard` |
| Reports | `/admin/profit-reports` |
| P&L | `/admin/profit-loss` |

---

## Need Help?

### For Technical Issues
Contact: technical-support@yourcompany.com

### For Permission Issues
Contact: Your Super Admin

### For Business Questions
Refer to: Profit Reporting Implementation documentation

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│     PROFIT REPORTING QUICK REF          │
├─────────────────────────────────────────┤
│ Dashboard: Real-time KPIs & trends      │
│ Reports:   Detailed order profits       │
│ P&L:       Monthly financial analysis   │
├─────────────────────────────────────────┤
│ Auto-Generate: On order DELIVERED       │
│ Permission:    PROFIT_LOSS_VIEW (P&L)   │
│ Access:        Admin role required      │
└─────────────────────────────────────────┘
```

---

**Last Updated:** January 18, 2026  
**Version:** 1.0.0  
**Status:** Production Ready
