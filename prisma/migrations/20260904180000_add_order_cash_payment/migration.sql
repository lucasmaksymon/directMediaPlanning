-- AlterTable
ALTER TABLE "ErpSaleOrder" ADD COLUMN "cashPayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "cashPayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ErpProductionOrder" ADD COLUMN "cashPayment" BOOLEAN NOT NULL DEFAULT false;
