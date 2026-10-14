-- AlterTable
ALTER TABLE "ErpSaleOrder" ADD COLUMN "attachmentUrl" TEXT;

-- AlterTable
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "attachmentUrl" TEXT;

-- AlterTable
ALTER TABLE "ErpProductionOrder" ADD COLUMN "attachmentUrl" TEXT;
