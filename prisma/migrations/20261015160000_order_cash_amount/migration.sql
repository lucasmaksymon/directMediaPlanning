ALTER TABLE "ErpSaleOrder" ADD COLUMN "cashAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "cashAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "cashAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Las órdenes marcadas "Pago efectivo" van completas en efectivo.
UPDATE "ErpSaleOrder" SET "cashAmount" = "net" WHERE "cashPayment" = true;
UPDATE "ErpPurchaseOrder" SET "cashAmount" = "net" WHERE "cashPayment" = true;
UPDATE "ErpProductionOrder" SET "cashAmount" = "net" WHERE "cashPayment" = true;
