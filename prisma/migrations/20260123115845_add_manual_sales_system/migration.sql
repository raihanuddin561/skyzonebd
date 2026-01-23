/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "gatewayResponse" JSONB,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "receivedBy" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "taxCategory" TEXT,
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxRate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "quantityReceived" INTEGER NOT NULL,
    "quantityRemaining" INTEGER NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "purchaseOrderRef" TEXT,
    "warehouseId" TEXT NOT NULL DEFAULT 'default',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_allocations" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_sales_entries" (
    "id" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "saleType" TEXT NOT NULL DEFAULT 'OFFLINE',
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerCompany" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "totalProfit" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "amountPaid" DOUBLE PRECISION,
    "adjustInventory" BOOLEAN NOT NULL DEFAULT true,
    "inventoryAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "attachments" TEXT[],
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_sales_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_sales_items" (
    "id" TEXT NOT NULL,
    "saleEntryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "manual_sales_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_lots_productId_idx" ON "stock_lots"("productId");

-- CreateIndex
CREATE INDEX "stock_lots_purchaseDate_idx" ON "stock_lots"("purchaseDate");

-- CreateIndex
CREATE INDEX "stock_lots_lotNumber_idx" ON "stock_lots"("lotNumber");

-- CreateIndex
CREATE INDEX "stock_allocations_lotId_idx" ON "stock_allocations"("lotId");

-- CreateIndex
CREATE INDEX "stock_allocations_orderId_idx" ON "stock_allocations"("orderId");

-- CreateIndex
CREATE INDEX "stock_allocations_orderItemId_idx" ON "stock_allocations"("orderItemId");

-- CreateIndex
CREATE INDEX "manual_sales_entries_saleDate_idx" ON "manual_sales_entries"("saleDate");

-- CreateIndex
CREATE INDEX "manual_sales_entries_customerId_idx" ON "manual_sales_entries"("customerId");

-- CreateIndex
CREATE INDEX "manual_sales_entries_enteredBy_idx" ON "manual_sales_entries"("enteredBy");

-- CreateIndex
CREATE INDEX "manual_sales_entries_saleType_idx" ON "manual_sales_entries"("saleType");

-- CreateIndex
CREATE INDEX "manual_sales_entries_createdAt_idx" ON "manual_sales_entries"("createdAt");

-- CreateIndex
CREATE INDEX "manual_sales_items_saleEntryId_idx" ON "manual_sales_items"("saleEntryId");

-- CreateIndex
CREATE INDEX "manual_sales_items_productId_idx" ON "manual_sales_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_sales_entries" ADD CONSTRAINT "manual_sales_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_sales_entries" ADD CONSTRAINT "manual_sales_entries_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_sales_items" ADD CONSTRAINT "manual_sales_items_saleEntryId_fkey" FOREIGN KEY ("saleEntryId") REFERENCES "manual_sales_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_sales_items" ADD CONSTRAINT "manual_sales_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
