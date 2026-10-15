-- Facturas de compra incluidas en una orden de pago o recibo quedan pagadas.
UPDATE "ErpPurchaseInvoice"
SET "payStatus" = 1
WHERE "payStatus" = 0
  AND (
    "id" IN (SELECT "invoiceId" FROM "ErpPaymentOrderInvoice")
    OR "id" IN (SELECT "invoiceId" FROM "ErpPurchaseReceiptInvoice")
  );
