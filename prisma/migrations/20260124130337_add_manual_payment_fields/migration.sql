-- AlterEnum
ALTER TYPE "LedgerSourceType" ADD VALUE 'MANUAL_SALE';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_VERIFICATION';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentNotes" TEXT,
ADD COLUMN     "paymentProofUrl" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "paymentVerifiedBy" TEXT;
