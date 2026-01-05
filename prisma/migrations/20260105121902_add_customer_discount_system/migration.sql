-- AlterTable
ALTER TABLE "users" ADD COLUMN     "discountPercent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "discountValidUntil" TIMESTAMP(3);
