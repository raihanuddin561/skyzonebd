-- CreateEnum
CREATE TYPE "LedgerSourceType" AS ENUM ('ORDER', 'EXPENSE', 'SALARY', 'ADJUSTMENT', 'REFUND', 'PURCHASE', 'RETURN', 'FEE', 'COMMISSION', 'INVESTMENT', 'WITHDRAWAL', 'TAX', 'UTILITY', 'RENT', 'MARKETING', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "financial_ledger" (
    "id" TEXT NOT NULL,
    "sourceType" "LedgerSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "category" TEXT,
    "subcategory" TEXT,
    "partyId" TEXT,
    "partyName" TEXT,
    "partyType" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "fiscalYear" INTEGER,
    "fiscalMonth" INTEGER,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "reconciledBy" TEXT,
    "orderId" TEXT,

    CONSTRAINT "financial_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_ledger_sourceType_idx" ON "financial_ledger"("sourceType");

-- CreateIndex
CREATE INDEX "financial_ledger_sourceId_idx" ON "financial_ledger"("sourceId");

-- CreateIndex
CREATE INDEX "financial_ledger_direction_idx" ON "financial_ledger"("direction");

-- CreateIndex
CREATE INDEX "financial_ledger_createdAt_idx" ON "financial_ledger"("createdAt");

-- CreateIndex
CREATE INDEX "financial_ledger_fiscalYear_fiscalMonth_idx" ON "financial_ledger"("fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "financial_ledger_orderId_idx" ON "financial_ledger"("orderId");

-- CreateIndex
CREATE INDEX "financial_ledger_isReconciled_idx" ON "financial_ledger"("isReconciled");

-- AddForeignKey
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
