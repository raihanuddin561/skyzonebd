/*
  Warnings:

  - The values [CASH_ON_DELIVERY] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `guestCompany` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `baseWholesalePrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `comparePrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `minOrderQuantity` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `retailMOQ` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `retailPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `wholesaleEnabled` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `wholesaleMOQ` on the `products` table. All the data in the column will be lost.
  - Added the required column `basePrice` to the `products` table without a default value. This is not possible if the table is not empty.
  - Made the column `wholesalePrice` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('INVENTORY_VIEW', 'INVENTORY_MANAGE', 'INVENTORY_REPORTS', 'EMPLOYEES_VIEW', 'EMPLOYEES_MANAGE', 'EMPLOYEES_REPORTS', 'SALARIES_VIEW', 'SALARIES_MANAGE', 'SALARIES_PROCESS', 'SALARIES_APPROVE', 'COSTS_VIEW', 'COSTS_MANAGE', 'COSTS_APPROVE', 'PROFIT_LOSS_VIEW', 'PROFIT_LOSS_REPORTS', 'PRODUCTS_VIEW', 'PRODUCTS_MANAGE', 'ORDERS_VIEW', 'ORDERS_MANAGE', 'ORDERS_PROCESS', 'CUSTOMERS_VIEW', 'CUSTOMERS_MANAGE', 'CATEGORIES_VIEW', 'CATEGORIES_MANAGE', 'USERS_VIEW', 'USERS_MANAGE', 'PERMISSIONS_MANAGE', 'SETTINGS_VIEW', 'SETTINGS_MANAGE', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'ANALYTICS_VIEW');

-- CreateEnum
CREATE TYPE "InventoryAction" AS ENUM ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE', 'EXPIRED', 'TRANSFER', 'RECOUNT');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'FREELANCE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'SICK_LEAVE', 'CASUAL_LEAVE', 'WORK_FROM_HOME');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('RENT', 'UTILITIES', 'SALARIES', 'MARKETING', 'SHIPPING', 'PACKAGING', 'OFFICE_SUPPLIES', 'MAINTENANCE', 'INSURANCE', 'TAXES', 'LEGAL', 'SOFTWARE', 'INVENTORY', 'TRANSPORTATION', 'COMMUNICATION', 'TRAINING', 'ENTERTAINMENT', 'BANK_CHARGES', 'DEPRECIATION', 'MISCELLANEOUS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PACKED';
ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET', 'CREDIT_CARD', 'INVOICE_NET30', 'INVOICE_NET60', 'INVOICE_NET90', 'LC');
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod_new" USING ("method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserType" ADD VALUE 'SELLER';
ALTER TYPE "UserType" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "business_info" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessCity" TEXT,
ADD COLUMN     "businessCountry" TEXT NOT NULL DEFAULT 'Bangladesh',
ADD COLUMN     "creditLimit" DOUBLE PRECISION,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "shippingPreferences" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "costPerUnit" DOUBLE PRECISION,
ADD COLUMN     "profitMargin" DOUBLE PRECISION,
ADD COLUMN     "profitPerUnit" DOUBLE PRECISION,
ADD COLUMN     "totalProfit" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "guestCompany",
ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "grossProfit" DOUBLE PRECISION,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "platformProfit" DOUBLE PRECISION,
ADD COLUMN     "profitMargin" DOUBLE PRECISION,
ADD COLUMN     "purchaseOrderNumber" TEXT,
ADD COLUMN     "sellerProfit" DOUBLE PRECISION,
ADD COLUMN     "totalCost" DOUBLE PRECISION;

-- AlterTable
-- First, add new columns as nullable
ALTER TABLE "products" 
ADD COLUMN     "allowSamples" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "basePrice" DOUBLE PRECISION,
ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "calculatedProfit" DOUBLE PRECISION,
ADD COLUMN     "costPerUnit" DOUBLE PRECISION,
ADD COLUMN     "customizationAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "handlingCost" DOUBLE PRECISION,
ADD COLUMN     "moq" INTEGER,
ADD COLUMN     "platformProfitPercentage" DOUBLE PRECISION NOT NULL DEFAULT 15,
ADD COLUMN     "reorderLevel" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "reorderQuantity" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "sampleMOQ" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "samplePrice" DOUBLE PRECISION,
ADD COLUMN     "sellerCommissionPercentage" DOUBLE PRECISION,
ADD COLUMN     "sellerProfit" DOUBLE PRECISION,
ADD COLUMN     "shippingCost" DOUBLE PRECISION;

-- Migrate data from old columns to new columns
-- basePrice = old price or retailPrice or wholesalePrice
UPDATE "products" SET "basePrice" = COALESCE("price", "retailPrice", "wholesalePrice", 0);

-- wholesalePrice should use old baseWholesalePrice or retailPrice or price
UPDATE "products" SET "wholesalePrice" = COALESCE("baseWholesalePrice", "retailPrice", "price", "wholesalePrice") WHERE "wholesalePrice" IS NULL;

-- moq from old minOrderQuantity or wholesaleMOQ
UPDATE "products" SET "moq" = COALESCE("minOrderQuantity", "wholesaleMOQ", "retailMOQ", 1);

-- Now make basePrice and wholesalePrice NOT NULL
ALTER TABLE "products" ALTER COLUMN "basePrice" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "wholesalePrice" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "unit" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "unit" DROP DEFAULT;

-- Now drop old columns
ALTER TABLE "products" 
DROP COLUMN "baseWholesalePrice",
DROP COLUMN "comparePrice",
DROP COLUMN "minOrderQuantity",
DROP COLUMN "price",
DROP COLUMN "retailMOQ",
DROP COLUMN "retailPrice",
DROP COLUMN "salePrice",
DROP COLUMN "wholesaleEnabled",
DROP COLUMN "wholesaleMOQ";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isProfitPartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profitSharePercentage" DOUBLE PRECISION,
ALTER COLUMN "userType" SET DEFAULT 'WHOLESALE',
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "wholesale_tiers" ADD COLUMN     "profitMargin" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" "PermissionModule" NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canExport" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "action" "InventoryAction" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_reports" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "revenue" DOUBLE PRECISION NOT NULL,
    "costOfGoods" DOUBLE PRECISION NOT NULL,
    "grossProfit" DOUBLE PRECISION NOT NULL,
    "shippingExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "handlingExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketingExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenses" DOUBLE PRECISION NOT NULL,
    "netProfit" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "platformProfit" DOUBLE PRECISION NOT NULL,
    "platformProfitPercent" DOUBLE PRECISION NOT NULL,
    "sellerProfit" DOUBLE PRECISION NOT NULL,
    "sellerProfitPercent" DOUBLE PRECISION NOT NULL,
    "sellerId" TEXT,
    "reportPeriod" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "currentLoad" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "resignationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonuses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "nidNumber" TEXT,
    "tinNumber" TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salaries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonuses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providentFund" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "workingDays" INTEGER NOT NULL DEFAULT 0,
    "presentDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "workHours" DOUBLE PRECISION,
    "overtime" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_costs" (
    "id" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "subCategory" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "vendor" TEXT,
    "vendorContact" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPeriod" TEXT,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_loss_reports" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "returnRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netRevenue" DOUBLE PRECISION NOT NULL,
    "openingStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cogs" DOUBLE PRECISION NOT NULL,
    "grossProfit" DOUBLE PRECISION NOT NULL,
    "grossMargin" DOUBLE PRECISION NOT NULL,
    "salaryExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilitiesExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketingExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOperatingExpenses" DOUBLE PRECISION NOT NULL,
    "operatingProfit" DOUBLE PRECISION NOT NULL,
    "operatingMargin" DOUBLE PRECISION NOT NULL,
    "netProfit" DOUBLE PRECISION NOT NULL,
    "netMargin" DOUBLE PRECISION NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_loss_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_permissions_userId_idx" ON "user_permissions"("userId");

-- CreateIndex
CREATE INDEX "user_permissions_module_idx" ON "user_permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_module_key" ON "user_permissions"("userId", "module");

-- CreateIndex
CREATE INDEX "inventory_logs_productId_idx" ON "inventory_logs"("productId");

-- CreateIndex
CREATE INDEX "inventory_logs_action_idx" ON "inventory_logs"("action");

-- CreateIndex
CREATE INDEX "inventory_logs_createdAt_idx" ON "inventory_logs"("createdAt");

-- CreateIndex
CREATE INDEX "profit_reports_orderId_idx" ON "profit_reports"("orderId");

-- CreateIndex
CREATE INDEX "profit_reports_productId_idx" ON "profit_reports"("productId");

-- CreateIndex
CREATE INDEX "profit_reports_reportDate_idx" ON "profit_reports"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "platform_config_key_key" ON "platform_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeId_key" ON "employees"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_employeeId_idx" ON "employees"("employeeId");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "employees"("isActive");

-- CreateIndex
CREATE INDEX "salaries_employeeId_idx" ON "salaries"("employeeId");

-- CreateIndex
CREATE INDEX "salaries_month_year_idx" ON "salaries"("month", "year");

-- CreateIndex
CREATE INDEX "salaries_paymentStatus_idx" ON "salaries"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "salaries_employeeId_month_year_key" ON "salaries"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "attendances_employeeId_idx" ON "attendances"("employeeId");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "attendances"("date");

-- CreateIndex
CREATE INDEX "attendances_status_idx" ON "attendances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employeeId_date_key" ON "attendances"("employeeId", "date");

-- CreateIndex
CREATE INDEX "operational_costs_category_idx" ON "operational_costs"("category");

-- CreateIndex
CREATE INDEX "operational_costs_month_year_idx" ON "operational_costs"("month", "year");

-- CreateIndex
CREATE INDEX "operational_costs_paymentStatus_idx" ON "operational_costs"("paymentStatus");

-- CreateIndex
CREATE INDEX "operational_costs_date_idx" ON "operational_costs"("date");

-- CreateIndex
CREATE INDEX "profit_loss_reports_month_year_idx" ON "profit_loss_reports"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "profit_loss_reports_month_year_key" ON "profit_loss_reports"("month", "year");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_reports" ADD CONSTRAINT "profit_reports_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_reports" ADD CONSTRAINT "profit_reports_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
