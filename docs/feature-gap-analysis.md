# SkyzoneBD — B2B Wholesale Platform Feature Gap Analysis & Roadmap
**Document:** `docs/feature-gap-analysis.md`  
**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer, QA Lead & Product Architect  
**Platform:** SkyzoneBD (B2B Wholesale Electrical & Electronics Marketplace, Bangladesh)  
**Standard Currency:** BDT (৳ / poisha) | **Standard Timezone:** Asia/Dhaka (UTC+6)  

---

## 1. Executive Summary

This gap analysis compares SkyzoneBD's current implementation against a full-scale industrial B2B wholesale platform (e.g., Alibaba B2B / Amazon Business / TradeKey standards adapted for the Bangladesh market).

SkyzoneBD currently features solid building blocks:
- Tiered wholesale pricing with quantity thresholds.
- MOQ and pack-size constraints.
- Double-entry financial ledger and multi-partner profit-sharing.
- Administrative manual sales creation for phone/walk-in orders.
- Basic RFQ negotiation workflow.

However, key commercial wholesale features—such as credit limit ledgers, 1-click RFQ-to-Order conversion, courier webhook reconciliation for Bangladesh couriers (Steadfast, Pathao, RedX), quick SKU reordering, and a centralized Command Palette (`Ctrl+K`)—are either missing or partially implemented.

---

## 2. Feature Matrix: Status, Business Value, Effort & Priority

| Category | Wholesale Feature | Current Status | Business Value | Effort | Recommended Priority | Notes / Requirements |
|---|---|---|---|---|---|---|
| **Customers & Accounts** | **B2B Account Verification Workflow** | **Exists** | High | S | P1 (Improve) | Verification docs upload (Trade License/BIN/NID) exists at `/admin/verification`. Needs status audit trail. |
| | **Customer Groups & Price Lists** | **Partial** | High | M | P1 | Currently has customer discounts, but not named tier groups (e.g. "Distributor Tier A" vs "Retailer Tier B"). |
| | **Credit Limits & Payment Terms (Net 15/30)** | **Missing** | Critical | M | P0 | Crucial for Bangladeshi wholesale electrical trade; requires customer credit ledger, balance tracking & overdue alerts. |
| | **Sales Rep / Account Manager Assignment** | **Missing** | Medium | M | P2 | Assign sales executives to wholesale accounts with commission tracking. |
| **Ordering** | **1-Click RFQ to Order / Invoice** | **Partial** | Critical | S | P0 | RFQ quote exists, but converting accepted quote into a live Order/Invoice requires 1-click conversion button. |
| | **Quick Order Form (Order by SKU)** | **Missing** | High | S | P1 | Rapid table entry for electrical contractors ordering 20+ SKUs in seconds without browsing catalog pages. |
| | **Bulk Order Upload (CSV / Excel)** | **Missing** | High | M | P1 | Upload `.csv` or `.xlsx` with `SKU, Quantity` to populate cart instantly. |
| | **1-Click Reorder & Order Templates** | **Missing** | Medium | S | P1 | Re-populate cart from past completed order or save recurring monthly supply templates. |
| | **Manual Order Creation (Phone / WhatsApp)** | **Exists** | High | S | P0 (Wire UI) | Fully built at `/admin/manual-sales` but was omitted from sidebar navigation; now restored. |
| | **Partial & Advance Payments** | **Partial** | High | M | P1 | Advance payment percentage configured in settings; needs dedicated installment payment collection ledger. |
| | **Abandoned Cart Recovery** | **Missing** | Medium | M | P2 | Track abandoned wholesale carts and trigger WhatsApp/email reminders. |
| **Inventory & Supply** | **Purchase Orders & Supplier Management** | **Exists** | High | S | Pass | Built at `/admin/purchase-orders` and `/admin/suppliers`. |
| | **Stock Movement History & Reason Codes** | **Exists** | High | S | Pass | Built at `/admin/inventory` and `/api/admin/stock/adjust`. |
| | **Multi-Warehouse / Godown Management** | **Missing** | Medium | L | P3 | Track stock by godown location (e.g. Nawabpur Central vs Chattogram Depot). |
| | **Batch / Lot & Expiry Tracking** | **Missing** | Low | M | P3 | Relevant for specialized battery/chemical lots, low priority for switches/cables. |
| | **Dead-Stock & Reorder Point Suggestions** | **Partial** | High | S | P1 | Reorder alerts exist; needs dead-stock report (0 sales in >90 days). |
| **Fulfillment & Logistics** | **Courier Integrations (Steadfast / Pathao / RedX)** | **Missing** | Critical | M | P0 | Automated order booking via API, airway bill (AWB) generation, and COD balance reconciliation. |
| | **Printable Invoices, Challans & Packing Slips** | **Partial** | High | S | P0 | Invoices exist; need standard Bangladesh VAT Challan (Mushak-6.3) and warehouse packing slip. |
| | **Returns & RMA Workflow** | **Exists** | High | S | Pass | Built at `/admin/returns` with approval/restocking and ledger reversal. |
| **Admin & Operations** | **Granular Roles & Permissions (RBAC)** | **Partial** | High | M | P1 | Roles exist (`ADMIN`, `STAFF`, `PARTNER`); need action-level matrix enforcement across all API endpoints. |
| | **Activity & Audit Log** | **Exists** | High | S | Pass | Built at `/admin/activity-logs`. |
| | **Command Palette (Ctrl+K)** | **Missing** | High | S | P1 | Instant keyboard navigation to jump to orders, customers, products, settings. |
| | **Live Notification Center** | **Partial** | Medium | S | P1 | `/admin/notifications` was a stub; needs real alerts for pending RFQs, low stock, unpaid orders. |
| | **Scheduled Export & DB Backup** | **Exists** | High | S | Pass | Built at `/admin/database`. |

---

## 3. Recommended Phased Implementation Roadmap

### Track A: Immediate High-Value Wholesale Wins (Recommended for Approval)
1. **1-Click RFQ to Order Conversion**: Add "Convert to Order" button on accepted RFQ quotes that instantly spawns an Order and Invoice.
2. **Bangladesh Courier Integration (Steadfast / Pathao)**:
   - Configure Courier API credentials in `/admin/payment-settings` / `/admin/shipping`.
   - 1-click booking and tracking code generation.
3. **Printable Delivery Challan & Packing Slip**: Branded printable warehouse challan conforming to Bangladeshi wholesale norms.
4. **Quick Order by SKU / Bulk Order Form**: Fast wholesale tabular ordering interface.
5. **Credit Limits & B2B Customer Ledger**: Track allowed credit balance and Net-30 payment due dates.

### Track B: Advanced Logistics & Marketing (Phase 2 Roadmap)
- Multi-warehouse godown tracking.
- Sales representative commission splits.
- Abandoned cart WhatsApp webhook.

---

> [!IMPORTANT]
> **Phase 4 Stop Checkpoint**: Per instructions, no wholesale gap features will be coded until you approve which features to build from the roadmap above.

