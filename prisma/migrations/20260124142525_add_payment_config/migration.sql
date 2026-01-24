-- CreateTable
CREATE TABLE "payment_configs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "accountType" TEXT,
    "bankName" TEXT,
    "branchName" TEXT,
    "routingNumber" TEXT,
    "instructions" TEXT,
    "logoUrl" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "payment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_configs_type_idx" ON "payment_configs"("type");

-- CreateIndex
CREATE INDEX "payment_configs_isActive_idx" ON "payment_configs"("isActive");
