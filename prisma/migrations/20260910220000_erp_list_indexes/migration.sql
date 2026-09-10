CREATE INDEX IF NOT EXISTS "ErpSaleOrder_year_month_idx" ON "ErpSaleOrder"("year", "month");
CREATE INDEX IF NOT EXISTS "ErpSaleOrder_issuedAt_idx" ON "ErpSaleOrder"("issuedAt");
CREATE INDEX IF NOT EXISTS "ErpSaleOrder_estado_idx" ON "ErpSaleOrder"("estado");

CREATE INDEX IF NOT EXISTS "ErpCampaignItem_startsAt_endsAt_idx" ON "ErpCampaignItem"("startsAt", "endsAt");

CREATE INDEX IF NOT EXISTS "ErpPurchaseOrder_issuedAt_idx" ON "ErpPurchaseOrder"("issuedAt");
CREATE INDEX IF NOT EXISTS "ErpPurchaseOrder_estado_idx" ON "ErpPurchaseOrder"("estado");

CREATE INDEX IF NOT EXISTS "ErpProductionOrder_issuedAt_idx" ON "ErpProductionOrder"("issuedAt");
CREATE INDEX IF NOT EXISTS "ErpProductionOrder_estado_idx" ON "ErpProductionOrder"("estado");

CREATE INDEX IF NOT EXISTS "ErpSaleInvoice_issuedAt_idx" ON "ErpSaleInvoice"("issuedAt");
CREATE INDEX IF NOT EXISTS "ErpSaleInvoice_collectStatus_idx" ON "ErpSaleInvoice"("collectStatus");

CREATE INDEX IF NOT EXISTS "ErpPurchaseInvoice_issuedAt_idx" ON "ErpPurchaseInvoice"("issuedAt");
CREATE INDEX IF NOT EXISTS "ErpPurchaseInvoice_payStatus_idx" ON "ErpPurchaseInvoice"("payStatus");
CREATE INDEX IF NOT EXISTS "ErpPurchaseInvoice_isVatPurchase_idx" ON "ErpPurchaseInvoice"("isVatPurchase");

CREATE INDEX IF NOT EXISTS "ErpPurchaseInvoiceOrder_invoiceId_idx" ON "ErpPurchaseInvoiceOrder"("invoiceId");
CREATE INDEX IF NOT EXISTS "ErpPurchaseInvoiceOrder_purchaseOrderId_idx" ON "ErpPurchaseInvoiceOrder"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "ErpPurchaseInvoiceOrder_productionOrderId_idx" ON "ErpPurchaseInvoiceOrder"("productionOrderId");

CREATE INDEX IF NOT EXISTS "ErpSaleReceiptInvoice_invoiceId_idx" ON "ErpSaleReceiptInvoice"("invoiceId");
CREATE INDEX IF NOT EXISTS "ErpPurchaseReceiptInvoice_invoiceId_idx" ON "ErpPurchaseReceiptInvoice"("invoiceId");
