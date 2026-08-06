# 06 — Database Analysis

Source: full read of `prisma/schema.prisma` (1,545 lines) and all 17 migrations. Provider: PostgreSQL via Neon (`datasource db { provider = "postgresql", url = env("DATABASE_URL") }`; no `directUrl` configured despite an unpooled Neon endpoint being available in the environment — migrations run over the pooled connection, an operational risk worth fixing).

## 1. Schema scale

**40 models, 19 enums**, uniform `id String @id @default(cuid())` on every model, uniform `@@map` to snake_case plural table names from PascalCase singular model names. **Zero many-to-many relations** anywhere — every relation is 1:1 or 1:N (e.g., `Product` tags are a scalar `String[]`, not a join table).

## 2. Model clusters

- **Identity**: User, UserPermission, BusinessInfo, Address, DataDeletionRequest, DataDeletionAuditLog
- **Catalog**: Unit (orphaned — see §5), Category, Product, WholesaleTier, HeroSlide, InventoryLog, Review, StockLot, StockAllocation
- **Commerce**: Order, OrderItem, Payment, RFQ, RFQItem, Sale, ManualSalesEntry, ManualSalesItem, PaymentConfig
- **Financial**: ProfitReport, ProfitLossReport, Partner, ProfitDistribution, FinancialLedger, PlatformConfig, OperationalCost
- **HR**: Employee, Salary, Attendance, Warehouse (orphaned — see §5)
- **Compliance/Audit**: ActivityLog (plus DataDeletion* above)

Full field-by-field listing is in the research transcript; this document surfaces what matters for engineering decisions rather than reproducing the entire schema.

## 3. Enums (19 total) — full values

- `UserRole` (7): SUPER_ADMIN, ADMIN, PARTNER, MANAGER, SELLER, BUYER, GUEST
- `UserType` (5): RETAIL, WHOLESALE, SELLER, ADMIN, GUEST
- `PermissionModule` (32): granular view/manage/reports/process/approve modules across Inventory, Employees, Salaries, Costs, Profit/Loss, Products, Orders, Customers, Categories, Users, Permissions, Settings, Reports, Analytics
- `VerificationStatus` (4): PENDING, APPROVED, REJECTED, RESUBMIT
- `RFQStatus` (5): PENDING, QUOTED, ACCEPTED, REJECTED, EXPIRED
- `AddressType` (2): SHIPPING, BILLING
- `OrderStatus` (10): PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED, RETURNED, REFUNDED
- `PaymentStatus` (6): PENDING, PENDING_VERIFICATION, PAID, PARTIAL, FAILED, REFUNDED
- `PaymentMethod` (9): BANK_TRANSFER, BKASH, NAGAD, ROCKET, CREDIT_CARD, INVOICE_NET30, INVOICE_NET60, INVOICE_NET90, LC
- `InventoryAction` (8): PURCHASE, SALE, RETURN, ADJUSTMENT, DAMAGE, EXPIRED, TRANSFER, RECOUNT
- `ActivityAction` (10): CREATE, UPDATE, DELETE, STATUS_CHANGE, CANCEL, RESTORE, EXPORT, IMPORT, LOGIN, LOGOUT
- `DeletionRequestStatus` (5): PENDING, PROCESSING, COMPLETED, REJECTED, CANCELLED
- `SaleType` (2): DIRECT, ORDER_BASED
- `EmploymentType` (5): FULL_TIME, PART_TIME, CONTRACT, INTERN, FREELANCE
- `AttendanceStatus` (8): PRESENT, ABSENT, HALF_DAY, LEAVE, HOLIDAY, SICK_LEAVE, CASUAL_LEAVE, WORK_FROM_HOME
- `CostCategory` (20): RENT, UTILITIES, SALARIES, MARKETING, SHIPPING, PACKAGING, OFFICE_SUPPLIES, MAINTENANCE, INSURANCE, TAXES, LEGAL, SOFTWARE, INVENTORY, TRANSPORTATION, COMMUNICATION, TRAINING, ENTERTAINMENT, BANK_CHARGES, DEPRECIATION, MISCELLANEOUS
- `ReviewStatus` (4): PENDING, APPROVED, HIDDEN, REJECTED
- `LedgerSourceType` (18): ORDER, EXPENSE, SALARY, ADJUSTMENT, REFUND, PURCHASE, RETURN, FEE, COMMISSION, INVESTMENT, WITHDRAWAL, TAX, UTILITY, RENT, MARKETING, SHIPPING, MANUAL_SALE, OTHER
- `LedgerDirection` (2): DEBIT, CREDIT

## 4. Critical fact-check: Product pricing fields (resolves the retail/wholesale contradiction)

The **current** `Product` model (schema lines ~226–311, banner-commented `// WHOLESALE PRICING ONLY`) has exactly three pricing fields: `basePrice Float` (cost), `wholesalePrice Float` (sell price), `moq Int?` (minimum order quantity, optional at the schema level despite being effectively required in practice). No `retailPrice`, `salePrice`, `retailMOQ`, `comparePrice`, or `wholesaleEnabled` field exists today.

This *was* a genuinely dual-pricing model at project inception (init migration had `retailPrice`, `salePrice`, `retailMOQ`, `comparePrice`, `wholesaleEnabled`, `wholesaleMOQ`, `baseWholesalePrice`, a generic `price`, and `minOrderQuantity` — nine pricing columns). Migration `20260103175348_migrate_product_pricing_schema` explicitly dropped every retail column with a data-preserving `COALESCE` migration into the new three-field shape. Full narrative in `02_Business_Requirements.md` §2.

## 5. Soft-delete, audit, and orphaned-model findings

- **Soft-delete style**: `isActive` boolean toggle only (no `deletedAt`, no "who deactivated" trail) on `User`, `Product`, `Category`, `Unit`, `Employee`, `Partner`, `Warehouse`, `HeroSlide`, `PaymentConfig`.
- **Hard-delete / status-machine models** (no soft-delete concept applies): `Order` (uses status + `cancelledAt/By/reason` instead), `Payment`, `RFQ`, `Sale`, `ManualSalesEntry`, `Review` (uses moderation `status` instead).
- **Append-only audit models** (correctly `createdAt`-only, no `updatedAt`): `OrderItem`, `RFQItem`, `ActivityLog`, `InventoryLog`, `FinancialLedger` (explicitly commented "Append-Only Audit Log" in-schema).
- **`ManualSalesItem` has zero timestamps at all** — the only model in the schema with neither `createdAt` nor `updatedAt`.
- **`Unit` model is orphaned**: unique `name`/`symbol`, but `Product.unit` is a loose `String?`, never wired via `@relation` to `Unit` — the lookup table was added (`add_units_table` migration) but never connected.
- **`Warehouse` model is orphaned**: zero relations to any other model; `StockLot.warehouseId` is `String @default("default")`, a placeholder, not a FK.
- **`StockAllocation.orderId`/`orderItemId`** are indexed but have **no `@relation`** to `Order`/`OrderItem` — an unenforced cross-aggregate reference (see `05_Domain_Model.md` §2).
- **Widespread untyped "actor" references**: `Order.cancelledBy`, `Order.paymentVerifiedBy`, `Review.moderatedBy`, `InventoryLog.performedBy`, `OperationalCost.approvedBy`, `ProfitDistribution.approvedBy`, `Payment.receivedBy`/`approvedBy`, `PaymentConfig.createdBy`/`updatedBy`, `StockLot.createdBy` are all loose strings with no FK to `User`, alongside other, structurally identical actor fields elsewhere that *are* real relations (`Sale.enteredBy`, `ManualSalesEntry.enteredBy`, `ActivityLog.userId`) — no referential integrity protects the former group.

## 6. Naming & type-consistency issues

- **Payment-method/status typing drift**: `Payment.method` is a proper `PaymentMethod` enum; `Order.paymentMethod`, `Sale.paymentMethod`, `ManualSalesEntry.paymentMethod`, `Salary.paymentMethod`, `OperationalCost.paymentMethod`, `ProfitDistribution.paymentMethod` are all plain `String`. Similarly `ManualSalesEntry.paymentStatus` and `ProfitDistribution.status` are free strings where sibling models use the proper enum.
- **`ManualSalesEntry.saleType`** is `String @default("OFFLINE")` while the conceptually identical `Sale.saleType` is the typed `SaleType` enum.
- **`Product.availability`** (`in_stock`/`limited`/`out_of_stock`/`pre_order` per comment) is a free string, an obvious candidate enum that was never formalized, unlike `OrderStatus`/`InventoryAction` elsewhere in the same schema.
- **`@db.*` type hints are essentially unused** — `PaymentConfig.instructions String? @db.Text` is the only occurrence in the entire 1,545-line schema; every other long free-text field relies on Prisma's default mapping, making the one annotation look accidental rather than policy.

## 7. Missing indexes / constraints (performance & integrity risk)

- **No `@@index`** on `Product.categoryId`, `Product.sellerId`, `Product.isActive`, `Product.isFeatured` — all primary storefront/admin filter columns; Postgres does not auto-index FK columns, so every category/seller/active-only product listing query does a sequential scan at scale.
- **No `@@index`** on `Address.userId`, `RFQ.userId`, `RFQItem.rfqId`/`productId`, and `User` has no index at all beyond the implicit unique on `email`.
- **No cross-reference/uniqueness** tying `Employee` to `User` — same human, two disconnected identity records if an admin is also payroll staff.
- **No `@unique`** on `Sale.invoiceNumber` or `ManualSalesEntry.referenceNumber` — duplicate invoice/reference numbers are possible today.
- **`Product.moq`** is optional (`Int?`) despite being fundamental to a wholesale-only catalog; every seed record populates it, implying it's a de facto required field never enforced at the schema level.

## 8. Migration history — evolution narrative

17 migrations, 2025-10-22 → 2026-01-24. Full chronological narrative (each migration's intent) is in `01_Project_Overview.md`/`02_Business_Requirements.md`'s history sections; the single most important structural event is **`20260103175348_migrate_product_pricing_schema`**, which — in one migration — both pivoted pricing to wholesale-only *and* bolted on a large, unrelated batch of ERP functionality (granular permissions, inventory logging, the entire HR module, operational costs, P&L reporting, platform config, `Warehouse`, order/order-item profit columns, expanded `BusinessInfo`, and partner profit-sharing fields). This single migration is functionally a second "init" and is the clearest evidence in the migration history of a mid-project pivot from a general dual-channel storefront to a wholesale-only platform with an attached back-office/ERP layer, executed as one large, multi-concern change rather than a sequence of reviewable, single-purpose migrations.

The recurring "three parallel subsystems for one concept" pattern documented in `05_Domain_Model.md` is visible directly in the migration timeline: `Sale` (2026-01-05), `Partner`/`ProfitDistribution` (2026-01-05, same day), `FinancialLedger` (2026-01-23), and `ManualSalesEntry`/`StockLot` (2026-01-23, same day as the ledger) were each added as fresh, self-contained features within a three-week window, without any migration ever consolidating or referencing the earlier, similar structures.

## 9. Candidate aggregates

See `05_Domain_Model.md` §2 for the full aggregate analysis derived from this schema's cascade/relation behavior.

## 10. Recommendations (feed directly into `10_Gap_Analysis.md` / `15_Implementation_Backlog.md`)

1. Add `directUrl` (unpooled Neon connection) to the Prisma datasource block for migration safety.
2. Add missing indexes on `Product.categoryId/sellerId/isActive/isFeatured`, `Address.userId`, `RFQ.userId`, `RFQItem.rfqId/productId`.
3. Wire `Product.unit` to the `Unit` table via a real `@relation`, or remove the `Unit` table if it's not going to be used.
4. Either build out `Warehouse` (relations, API, UI) or remove it — an orphaned model with no code path is pure confusion for the next engineer.
5. Formalize `Product.availability` and the various free-string "status"/"method"/"type" fields listed in §6 as proper enums for type safety and query-ability.
6. Decide (stakeholder input required, per `02_Business_Requirements.md` §6) whether `Sale`, `Order`, and `ManualSalesEntry` should be consolidated into one "transaction" concept with a channel discriminator, and whether `Partner`, `User.isProfitPartner`, and `Product.sellerId` should be consolidated into one "profit-sharing party" concept.
