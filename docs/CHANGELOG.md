# Changelog — SkyzoneBD Wholesale Platform

All notable changes to the SkyzoneBD wholesale platform architecture, pricing calculations, profit sharing, and redesign are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Phase 3] - 2026-11-03

### Added
- **Profit Sharing & Distribution Engine (`src/services/profitSharingService.ts`)**:
  - Implemented percentage-based profit sharing using integer poisha math.
  - Strict 100.00% validation on active stakeholder share rules with unassigned / over-assigned detection.
  - Largest Remainder Method distribution ensuring exact poisha balancing with zero leakage.
  - Retained earnings reserve percentage deduction.
  - Loss carry-forward tracking across accounting periods with automatic offset in profitable periods.
  - Stakeholder statement generator with complete financial transparency (gross profit, returns, delivery, gateway fees, operational expenses, net profit, reserve, distributable, share %).
- **Profit Sharing Test Suite (`__tests__/services/profitSharingService.test.ts`)**:
  - 10 automated unit and integration tests covering equal split, unequal split, 100% validation rejection, negative percentages, loss carry-forward, prior loss offset, reserve deduction, and statement generation.
  - Enforced strict invariant: `sum(shares) + reserve === netProfitAfterLossOffset` to the exact poisha across all tests.

---

## [Phase 2] - 2026-11-03

### Added
- **Central Calculation Service (`src/services/calculationService.ts`)**:
  - Pure integer poisha money handling (`1 BDT = 100 poisha`).
  - Documented Round Half Up rule for fractional poisha.
  - Largest Remainder Method (Hare-Niemeyer) for proportional discount and remainder allocation with zero leakage.
  - Wholesale volume tier price resolution with boundary validation (boundary checks at 49, 50, 199, 200).
  - Minimum Order Quantity (MOQ) and carton pack size (step) validation.
  - Coupon evaluation engine supporting `PERCENTAGE` (with max cap), `FIXED_AMOUNT`, and `FREE_DELIVERY`.
  - Comprehensive coupon validation (dates, total usage limits, per-customer limits, minimum order amounts, product/category whitelists/blacklists, first-order restriction).
  - Proportional allocation of order-level coupon discounts to line items using largest-remainder poisha balancing.
  - VAT calculation supporting both exclusive (added at checkout) and inclusive (contained in price) modes.
  - Zone-based delivery calculation with free delivery threshold waiver.
  - Extra charges calculation (COD fee, packaging fee, payment gateway fee, custom fees).
  - Grand total calculation and order profit/gross margin reporting.
- **Formulas Specification (`docs/calculations.md`)**:
  - Plain language documentation of the order of operations, tier rules, coupon scenarios, tax modes, and profit formulas for staff and auditors.
- **Automated Test Suite (`__tests__/services/calculationService.test.ts`)**:
  - 18 comprehensive unit and integration tests covering all mandatory Phase 2 scenarios, including boundary tests, coupon failures, VAT modes, large orders, and client price tampering rejection.

---

## [Phase 1] - 2026-11-02

### Added
- **Comprehensive Audit Report (`docs/01-audit-report.md`)**:
  - Detailed discovery and analysis of tech stack, project structure, data models, feature inventory, hardcoded values, calculation map, existing profit-sharing logic, risks, and UI/UX quality bar.
  - Prioritized problem list (Critical, High, Medium, Low).

