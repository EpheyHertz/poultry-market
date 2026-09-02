-- Add in-app refund tracking to support transactions.
--
-- Refunds are handled entirely inside our own ledger (reverse the wallet
-- counters and mark the transaction REFUNDED). We deliberately do NOT call
-- IntaSend's refund/chargeback API for author support payments.
--
-- The REFUNDED value already exists on the SupportPaymentStatus enum, so only
-- the audit columns are new here.

-- AlterTable
ALTER TABLE "support_transactions"
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundReason" TEXT,
  ADD COLUMN "refundedById" TEXT;

-- CreateIndex
CREATE INDEX "support_transactions_refundedAt_idx" ON "support_transactions"("refundedAt");
