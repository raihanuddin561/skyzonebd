# SkyzoneBD — Financial Calculations & Pricing Engine Specification

**Document Version**: 2.0  
**Target Audience**: Store Administrators, Finance Managers, Stakeholders, Developers  
**Base Unit of Account**: Bangladeshi Poisha (1 BDT ৳ = 100 Poisha)

---

## 1. Core Principles of Money Handling

To eliminate rounding errors, "missing pennies", and financial discrepancies:
1. **Integer Poisha Arithmetic**: All financial values are stored and calculated as integer poisha (`৳100.50` is stored and calculated as `10050` poisha). Floating-point arithmetic (`0.1 + 0.2`) is strictly forbidden for money.
2. **Canonical Rounding Rule**: Whenever fractional poisha occur (e.g. 15% VAT on an odd amount), we apply **Round Half Up** (rounding 0.5 poisha towards positive infinity).
3. **Largest Remainder Method (Hare-Niemeyer)**: When allocating discounts or profit shares across multiple items or partners, raw division produces fractional remainders. We round each share down to the nearest integer poisha, rank the remainders in descending order, and distribute the remaining poisha one-by-one to the largest remainders. This guarantees that:
   $$\sum \text{Allocated Parts} \equiv \text{Total to Allocate}$$
   Every single poisha is accounted for with zero leakage.

---

## 2. Wholesale Pricing & Quantity Tiers

### 2.1 Wholesale Volume Tiers
Wholesale products offer tiered pricing depending on volume:
- **Base Wholesale Price**: The default price for an order meeting the Minimum Order Quantity (MOQ).
- **Quantity Tiers**: Volume brackets (e.g., 1–49 pcs: ৳150, 50–199 pcs: ৳140, 200+ pcs: ৳130).
- **Validation Rules**:
  - Tiers cannot overlap (e.g., 50–100 and 90–150 is rejected).
  - Tiers cannot leave unintended gaps.
  - The highest tier is unbounded (`maxQuantity = null`).
- **Carton / Step Increments**: Products sold in cartons or dozens (e.g., pack size = 12) require ordered quantities to be an exact multiple of the pack size (`quantity % packSize === 0`).

### 2.2 Customer Discounts (VIP / Special Terms)
A verified customer may have a custom discount percentage recorded on their account (e.g. 5% VIP discount):
$$\text{Line Customer Discount} = \text{RoundHalfUp}\left(\frac{\text{Tier Unit Price} \times \text{Quantity} \times \text{Discount } \%}{100}\right)$$
$$\text{Line Subtotal} = (\text{Tier Unit Price} \times \text{Quantity}) - \text{Line Customer Discount}$$

---

## 3. Order Calculation Formula (Order of Operations)

Every checkout order is computed on the server in this strict sequence:

```
[1] Line Total       = (Tier Unit Price × Quantity) − Customer Line Discount
[2] Subtotal         = Sum of all Line Totals
[3] Coupon Discount  = Evaluated per coupon rules, capped at maxDiscount
[4] Taxable Amount   = Subtotal − (Coupon Discount if applied before VAT)
[5] VAT              = Taxable Amount × VAT Rate (if enabled)
[6] Delivery Charge  = Zone Rate (waived if Subtotal ≥ Free Delivery Threshold or Free Delivery Coupon)
[7] Extra Charges    = COD Fee + Packaging Fee + Gateway Fee + Custom Admin Fees
[8] Grand Total      = Taxable Amount + (VAT if exclusive) + Delivery Charge + Extra Charges
```

### 3.1 Proportional Coupon Allocation
When a coupon discount (e.g., ৳500 off) is applied to an order, it is not simply deducted at the cart level. It is distributed across eligible items in proportion to their line totals using the **Largest Remainder Method**.
- This ensures that line-level cost, net revenue, and gross profit are 100% accurate for tax and partner reporting.

### 3.2 Tax (VAT) Calculation Modes
- **VAT Exclusive (Standard Wholesale)**: Prices in the catalog do not include tax.
  $$\text{VAT} = \text{RoundHalfUp}\left(\frac{\text{Taxable Amount} \times \text{VAT Rate } \%}{100}\right)$$
  $$\text{Grand Total} = \text{Taxable Amount} + \text{VAT} + \text{Delivery} + \text{Extra Charges}$$
- **VAT Inclusive**: Prices already contain VAT.
  $$\text{VAT Portion} = \text{RoundHalfUp}\left(\text{Taxable Amount} - \frac{\text{Taxable Amount}}{1 + \text{VAT Rate}}\right)$$
  $$\text{Grand Total} = \text{Taxable Amount} + \text{Delivery} + \text{Extra Charges}$$

---

## 4. Cost, Gross Profit & Order Margin

On every completed order:
- **Unit Cost Price**: Captured from Weighted Average Cost (WAC) lots or product cost baseline.
- **Line Net Revenue**: Line subtotal minus allocated coupon discount.
- **Line Gross Profit**:
  $$\text{Line Gross Profit} = \text{Line Net Revenue} - (\text{Unit Cost} \times \text{Quantity})$$
- **Line Margin %**:
  $$\text{Margin } \% = \frac{\text{Line Gross Profit}}{\text{Line Net Revenue}} \times 100$$
- **Net Order Profit**:
  $$\text{Net Order Profit} = \text{Net Revenue} - \text{Total Cost of Goods} - \text{Delivery Cost (Paid by Platform)} - \text{Gateway Fees}$$

---

## 5. Coupon Scenarios Supported

| Coupon Type | Business Logic |
| :--- | :--- |
| **PERCENTAGE** | Deducts $X\%$ of eligible items subtotal, capped at `maxDiscount` if configured. |
| **FIXED_AMOUNT** | Deducts fixed ৳ amount, capped at the eligible items subtotal (cannot create negative total). |
| **FREE_DELIVERY** | Sets the delivery charge to ৳0 while leaving item prices unchanged. |

**Validation Rules Enforced**:
1. Active date window (`startDate` to `endDate`).
2. Global total usage limit (atomic count).
3. Per-customer usage limit.
4. First-order only restriction.
5. Minimum order amount threshold.
6. Product / Category whitelists and blacklists.


---

## 6. Profit Sharing & Partner Distributions (Phase 3)

The platform implements an automated percentage-based distribution engine that guarantees exact accounting and reproducibility.

### 6.1 Order of Operations & Formula
```
[1] Gross Revenue      = Sum of Line Net Revenue for orders DELIVERED in period
[2] Gross COGS         = Sum of Cost of Goods Sold for orders DELIVERED in period
[3] Gross Profit       = Gross Revenue − Gross COGS
[4] Returns & Refunds  = Sum of (Refund Amount − Restocked COGS) processed in period
[5] Delivery Costs     = Business-borne delivery fees paid to courier in period
[6] Gateway Fees       = Payment gateway transaction charges in period
[7] Net Order Profit   = Gross Profit − Returns − Delivery Costs − Gateway Fees
[8] Operating Expenses = Sum of Rent, Salaries, Utilities, etc. paid in period
[9] Net Period Profit  = Net Order Profit − Operating Expenses
```

### 6.2 Loss Carry-Forward & Reserve Deductions
- **Loss Period Handling**:
  If $\text{Net Period Profit} < 0$, the period produces zero distributions and the entire unabsorbed loss is carried forward to the next period:
  $$\text{Loss Carried Forward} = \text{Prior Loss} + |\text{Net Period Profit}|$$
- **Profitable Period Offset**:
  If $\text{Net Period Profit} > 0$ and prior loss exists:
  $$\text{Net Distributable Basis} = \max(0, \text{Net Period Profit} - \text{Loss Carried Forward})$$
- **Reserve / Retained Earnings**:
  $$\text{Reserve Amount} = \text{RoundHalfUp}\left(\frac{\text{Net Distributable Basis} \times \text{Reserve } \%}{100}\right)$$
  $$\text{Distributable Profit Pool} = \text{Net Distributable Basis} - \text{Reserve Amount}$$

### 6.3 Stakeholder Share Allocation
Each active stakeholder receives their configured percentage:
$$\text{Raw Share} = \text{Distributable Profit Pool} \times \left(\frac{\text{Stakeholder } \%}{100}\right)$$
- Raw shares are converted using the **Largest Remainder Method** in integer poisha so that:
  $$\sum \text{Stakeholder Shares} + \text{Reserve Amount} \equiv \text{Net Distributable Basis}$$
- **100% Validation**: Saving share rules is blocked unless active percentages sum to **exactly 100.00%**.
