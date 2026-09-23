-- Schema hardening pass (full-project bug audit, 2026-09):
-- 1. StockLot/InventoryLog no longer cascade-delete when their Product is
--    deleted (was silently destroying purchase-cost/audit history for a
--    restocked-but-unsold product) — now Restrict.
-- 2. ActivityLog.userId is now nullable + SetNull on user delete, so the
--    audit trail survives a hard-deleted admin account instead of being
--    wiped with it.
-- 3. ManualSalesEntry.saleType/paymentStatus and ProfitDistribution.status
--    move from free-text String to real enums, matching every other status
--    field in this schema. Converted via a safe `USING` cast (not a
--    drop-and-recreate) so any existing row data survives the migration —
--    this only fails loudly (migration aborts, nothing corrupted) if a row
--    ever held a value outside the enum, rather than silently discarding it.
-- 4. Two unique constraints that were already declared in schema.prisma
--    (with "requires a migration to take effect" comments) are finally
--    applied: ProfitDistribution(partnerId, startDate, endDate) — closes
--    the duplicate-payout-generation race — and ProfitReport(orderId) —
--    closes the duplicate-profit-report race. Until now these were only
--    enforced by an application-level advisory lock; this migration makes
--    them a real, unconditional database guarantee as well.
-- 5. Supplier.email gets a unique constraint, preventing the same
--    real-world vendor being entered as multiple Supplier rows.
-- 6. New ReviewVote table: one helpfulness vote per user per review,
--    replacing an unbounded increment with no per-user record.

-- CreateEnum
CREATE TYPE "ProfitDistributionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "ManualSaleType" AS ENUM ('OFFLINE', 'PHONE_ORDER', 'WHOLESALE_DIRECT', 'EXTERNAL_CHANNEL', 'OTHER');

-- DropForeignKey
ALTER TABLE "public"."activity_logs" DROP CONSTRAINT "activity_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_logs" DROP CONSTRAINT "inventory_logs_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."stock_lots" DROP CONSTRAINT "stock_lots_productId_fkey";

-- DropIndex
DROP INDEX "public"."profit_reports_orderId_idx";

-- AlterTable
ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable: convert saleType/paymentStatus to real enums via a safe cast
-- (existing values must already be one of the enum's members — true for
-- every value the admin UI has ever written: OFFLINE/PHONE_ORDER/
-- WHOLESALE_DIRECT/EXTERNAL_CHANNEL/OTHER and PAID/PARTIAL/PENDING).
ALTER TABLE "manual_sales_entries"
  ALTER COLUMN "saleType" DROP DEFAULT,
  ALTER COLUMN "saleType" TYPE "ManualSaleType" USING ("saleType"::text::"ManualSaleType"),
  ALTER COLUMN "saleType" SET DEFAULT 'OFFLINE';

ALTER TABLE "manual_sales_entries"
  ALTER COLUMN "paymentStatus" DROP DEFAULT,
  ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING ("paymentStatus"::text::"PaymentStatus"),
  ALTER COLUMN "paymentStatus" SET DEFAULT 'PAID';

-- AlterTable: convert status to a real enum via a safe cast (existing
-- values must already be PENDING/APPROVED/PAID/REJECTED).
ALTER TABLE "profit_distributions"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ProfitDistributionStatus" USING ("status"::text::"ProfitDistributionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_votes_reviewId_idx" ON "review_votes"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_userId_key" ON "review_votes"("reviewId", "userId");

-- manual_sales_entries_saleType_idx and profit_distributions_status_idx
-- already exist from an earlier migration — ALTER COLUMN ... TYPE ... USING
-- above rebuilds an existing index on that column in place (same name),
-- unlike a DROP+ADD COLUMN approach, so no separate CREATE INDEX is needed
-- (or valid — it would conflict) for either of them here.

-- CreateIndex
CREATE INDEX "products_brand_idx" ON "products"("brand");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
-- Closes the duplicate-payout-generation race (admin/payouts/generate/route.ts).
CREATE UNIQUE INDEX "profit_distributions_partnerId_startDate_endDate_key" ON "profit_distributions"("partnerId", "startDate", "endDate");

-- CreateIndex
-- Closes the duplicate-profit-report race (utils/profitReportGeneration.ts).
CREATE UNIQUE INDEX "profit_reports_orderId_key" ON "profit_reports"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_email_key" ON "suppliers"("email");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
