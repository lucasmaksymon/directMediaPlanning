-- AlterTable
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 21;

-- Las órdenes históricas usan 21% o van sin IVA discriminado.
UPDATE "ErpPurchaseOrder" SET "vatRate" = 0 WHERE "vat" = 0;

-- El IVA pasa a derivarse del neto final: realinea la orden que quedó desfasada
-- por un ajuste aplicado después de haberse calculado el IVA sobre el bruto.
UPDATE "ErpPurchaseOrder"
SET "vat" = ROUND("net" * "vatRate" / 100, 2),
    "amount" = "net" + ROUND("net" * "vatRate" / 100, 2)
WHERE "vat" <> ROUND("net" * "vatRate" / 100, 2);
