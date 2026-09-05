-- AlterTable
ALTER TABLE "ErpTreasuryPayment" ADD COLUMN "endorsedFromId" TEXT;

-- CreateIndex
CREATE INDEX "ErpTreasuryPayment_endorsedFromId_idx" ON "ErpTreasuryPayment"("endorsedFromId");

-- AddForeignKey
ALTER TABLE "ErpTreasuryPayment" ADD CONSTRAINT "ErpTreasuryPayment_endorsedFromId_fkey" FOREIGN KEY ("endorsedFromId") REFERENCES "ErpTreasuryPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
