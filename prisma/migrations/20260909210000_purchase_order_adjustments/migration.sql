-- AlterTable
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "circuit" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "support" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "plaza" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "costLabel" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "days" INTEGER;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "spotCount" INTEGER;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "grossNet" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Las órdenes previas no tenían ajustes: el neto final es también el costo bruto.
UPDATE "ErpPurchaseOrder" SET "grossNet" = "net";

-- CreateTable
CREATE TABLE "ErpPurchaseOrderAdjustment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" INTEGER NOT NULL DEFAULT 1,
    "percent" DECIMAL(8,4),
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpPurchaseOrderAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErpPurchaseOrderAdjustment_purchaseOrderId_idx" ON "ErpPurchaseOrderAdjustment"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "ErpPurchaseOrderAdjustment" ADD CONSTRAINT "ErpPurchaseOrderAdjustment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "ErpPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
