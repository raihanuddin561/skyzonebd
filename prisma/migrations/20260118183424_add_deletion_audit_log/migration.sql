-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'PARTNER';
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'GUEST';

-- CreateTable
CREATE TABLE "data_deletion_audit_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "DeletionRequestStatus",
    "newStatus" "DeletionRequestStatus",
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_deletion_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_deletion_audit_logs_requestId_idx" ON "data_deletion_audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "data_deletion_audit_logs_adminId_idx" ON "data_deletion_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "data_deletion_audit_logs_action_idx" ON "data_deletion_audit_logs"("action");

-- AddForeignKey
ALTER TABLE "data_deletion_audit_logs" ADD CONSTRAINT "data_deletion_audit_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "data_deletion_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
