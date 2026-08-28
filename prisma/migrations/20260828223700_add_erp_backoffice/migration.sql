-- CreateTable
CREATE TABLE "ErpCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "paymentDays" INTEGER NOT NULL DEFAULT 30,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "executiveUserId" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "costRate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "agencyFee" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "taxCondition" INTEGER NOT NULL DEFAULT 0,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "industry" TEXT,
    "legalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpVendor" (
    "id" TEXT NOT NULL,
    "kind" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "address" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "cbu" TEXT,
    "taxCondition" INTEGER NOT NULL DEFAULT 0,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "paymentDays" INTEGER NOT NULL DEFAULT 30,
    "nextmediaProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpProvince" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpProvince_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpCity" (
    "id" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpCurrency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(14,6) NOT NULL DEFAULT 1,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpElement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpSaleOrder" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "net" DECIMAL(14,2) NOT NULL,
    "vat" DECIMAL(14,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "attachmentExt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpSaleOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpCampaignItem" (
    "id" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "location" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpCampaignItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpGestionLine" (
    "id" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "element" TEXT,
    "location" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "purchaseInvoiceId" TEXT,
    "productionInvoiceId" TEXT,
    "saleInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpGestionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpPurchaseOrder" (
    "id" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "number" TEXT NOT NULL,
    "net" DECIMAL(14,2) NOT NULL,
    "vat" DECIMAL(14,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "attachmentExt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpProductionOrder" (
    "id" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "number" TEXT NOT NULL,
    "net" DECIMAL(14,2) NOT NULL,
    "vat" DECIMAL(14,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "attachmentExt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpSaleInvoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "docType" TEXT NOT NULL,
    "pos" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "vat" DECIMAL(14,2) NOT NULL,
    "legalName" TEXT,
    "detail" TEXT,
    "collected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "receiptRef" TEXT,
    "retVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "retSuss" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "retGan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "retIibb" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "echeq" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bank" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "collectStatus" INTEGER NOT NULL DEFAULT 0,
    "attachmentExt" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpSaleInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpPurchaseInvoice" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "docType" TEXT NOT NULL,
    "pos" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "vat" DECIMAL(14,2) NOT NULL,
    "vatWithholding" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "iibbCaba" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "iibbBsAs" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "internalTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "nonTaxable" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isVatPurchase" BOOLEAN NOT NULL DEFAULT false,
    "isCreditNote" BOOLEAN NOT NULL DEFAULT false,
    "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "diegoFee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payStatus" INTEGER NOT NULL DEFAULT 0,
    "attachmentExt" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpPurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpPurchaseInvoiceOrder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "productionOrderId" TEXT,
    "vendorKind" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpPurchaseInvoiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpSaleReceipt" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "attachmentExt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpSaleReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpSaleReceiptInvoice" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "ErpSaleReceiptInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpPurchaseReceipt" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "attachmentExt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpPurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpPurchaseReceiptInvoice" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "ErpPurchaseReceiptInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpPaymentOrder" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpPaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpPaymentOrderInvoice" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "ErpPaymentOrderInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpTreasuryPayment" (
    "id" TEXT NOT NULL,
    "saleReceiptId" TEXT,
    "purchaseReceiptId" TEXT,
    "paymentOrderId" TEXT,
    "paymentKind" INTEGER NOT NULL,
    "number" TEXT,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "checkOrder" INTEGER NOT NULL DEFAULT 0,
    "checkType" INTEGER NOT NULL DEFAULT 0,
    "checkMode" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpTreasuryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpExpense" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "fixed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bank" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commissions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErpClient_companyId_idx" ON "ErpClient"("companyId");

-- CreateIndex
CREATE INDEX "ErpClient_name_idx" ON "ErpClient"("name");

-- CreateIndex
CREATE INDEX "ErpVendor_kind_name_idx" ON "ErpVendor"("kind", "name");

-- CreateIndex
CREATE INDEX "ErpCity_provinceId_idx" ON "ErpCity"("provinceId");

-- CreateIndex
CREATE INDEX "ErpSaleOrder_clientId_year_month_idx" ON "ErpSaleOrder"("clientId", "year", "month");

-- CreateIndex
CREATE INDEX "ErpSaleOrder_number_idx" ON "ErpSaleOrder"("number");

-- CreateIndex
CREATE INDEX "ErpCampaignItem_saleOrderId_idx" ON "ErpCampaignItem"("saleOrderId");

-- CreateIndex
CREATE INDEX "ErpGestionLine_saleOrderId_sort_idx" ON "ErpGestionLine"("saleOrderId", "sort");

-- CreateIndex
CREATE INDEX "ErpPurchaseOrder_saleOrderId_idx" ON "ErpPurchaseOrder"("saleOrderId");

-- CreateIndex
CREATE INDEX "ErpPurchaseOrder_vendorId_idx" ON "ErpPurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "ErpProductionOrder_saleOrderId_idx" ON "ErpProductionOrder"("saleOrderId");

-- CreateIndex
CREATE INDEX "ErpProductionOrder_vendorId_idx" ON "ErpProductionOrder"("vendorId");

-- CreateIndex
CREATE INDEX "ErpSaleInvoice_saleOrderId_idx" ON "ErpSaleInvoice"("saleOrderId");

-- CreateIndex
CREATE INDEX "ErpSaleInvoice_clientId_idx" ON "ErpSaleInvoice"("clientId");

-- CreateIndex
CREATE INDEX "ErpPurchaseInvoice_vendorId_idx" ON "ErpPurchaseInvoice"("vendorId");

-- CreateIndex
CREATE INDEX "ErpSaleReceipt_clientId_idx" ON "ErpSaleReceipt"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ErpSaleReceiptInvoice_receiptId_invoiceId_key" ON "ErpSaleReceiptInvoice"("receiptId", "invoiceId");

-- CreateIndex
CREATE INDEX "ErpPurchaseReceipt_vendorId_idx" ON "ErpPurchaseReceipt"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ErpPurchaseReceiptInvoice_receiptId_invoiceId_key" ON "ErpPurchaseReceiptInvoice"("receiptId", "invoiceId");

-- CreateIndex
CREATE INDEX "ErpPaymentOrder_vendorId_idx" ON "ErpPaymentOrder"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ErpPaymentOrderInvoice_paymentOrderId_invoiceId_key" ON "ErpPaymentOrderInvoice"("paymentOrderId", "invoiceId");

-- CreateIndex
CREATE INDEX "ErpTreasuryPayment_saleReceiptId_idx" ON "ErpTreasuryPayment"("saleReceiptId");

-- CreateIndex
CREATE INDEX "ErpTreasuryPayment_purchaseReceiptId_idx" ON "ErpTreasuryPayment"("purchaseReceiptId");

-- CreateIndex
CREATE INDEX "ErpTreasuryPayment_paymentOrderId_idx" ON "ErpTreasuryPayment"("paymentOrderId");

-- CreateIndex
CREATE INDEX "ErpTreasuryPayment_paymentKind_estado_idx" ON "ErpTreasuryPayment"("paymentKind", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ErpExpense_month_year_key" ON "ErpExpense"("month", "year");

-- AddForeignKey
ALTER TABLE "ErpClient" ADD CONSTRAINT "ErpClient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ErpCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpClient" ADD CONSTRAINT "ErpClient_executiveUserId_fkey" FOREIGN KEY ("executiveUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpVendor" ADD CONSTRAINT "ErpVendor_nextmediaProviderId_fkey" FOREIGN KEY ("nextmediaProviderId") REFERENCES "ProviderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpCity" ADD CONSTRAINT "ErpCity_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "ErpProvince"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSaleOrder" ADD CONSTRAINT "ErpSaleOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ErpClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpCampaignItem" ADD CONSTRAINT "ErpCampaignItem_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "ErpSaleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpGestionLine" ADD CONSTRAINT "ErpGestionLine_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "ErpSaleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpGestionLine" ADD CONSTRAINT "ErpGestionLine_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "ErpPurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpGestionLine" ADD CONSTRAINT "ErpGestionLine_productionInvoiceId_fkey" FOREIGN KEY ("productionInvoiceId") REFERENCES "ErpPurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpGestionLine" ADD CONSTRAINT "ErpGestionLine_saleInvoiceId_fkey" FOREIGN KEY ("saleInvoiceId") REFERENCES "ErpSaleInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseOrder" ADD CONSTRAINT "ErpPurchaseOrder_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "ErpSaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseOrder" ADD CONSTRAINT "ErpPurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ErpVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpProductionOrder" ADD CONSTRAINT "ErpProductionOrder_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "ErpSaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpProductionOrder" ADD CONSTRAINT "ErpProductionOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ErpVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSaleInvoice" ADD CONSTRAINT "ErpSaleInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ErpClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSaleInvoice" ADD CONSTRAINT "ErpSaleInvoice_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "ErpSaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseInvoice" ADD CONSTRAINT "ErpPurchaseInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ErpVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseInvoiceOrder" ADD CONSTRAINT "ErpPurchaseInvoiceOrder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ErpPurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseInvoiceOrder" ADD CONSTRAINT "ErpPurchaseInvoiceOrder_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "ErpPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseInvoiceOrder" ADD CONSTRAINT "ErpPurchaseInvoiceOrder_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ErpProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSaleReceipt" ADD CONSTRAINT "ErpSaleReceipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ErpClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSaleReceiptInvoice" ADD CONSTRAINT "ErpSaleReceiptInvoice_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "ErpSaleReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSaleReceiptInvoice" ADD CONSTRAINT "ErpSaleReceiptInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ErpSaleInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseReceipt" ADD CONSTRAINT "ErpPurchaseReceipt_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ErpVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseReceiptInvoice" ADD CONSTRAINT "ErpPurchaseReceiptInvoice_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "ErpPurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPurchaseReceiptInvoice" ADD CONSTRAINT "ErpPurchaseReceiptInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ErpPurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPaymentOrder" ADD CONSTRAINT "ErpPaymentOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ErpVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPaymentOrderInvoice" ADD CONSTRAINT "ErpPaymentOrderInvoice_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "ErpPaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpPaymentOrderInvoice" ADD CONSTRAINT "ErpPaymentOrderInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ErpPurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpTreasuryPayment" ADD CONSTRAINT "ErpTreasuryPayment_saleReceiptId_fkey" FOREIGN KEY ("saleReceiptId") REFERENCES "ErpSaleReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpTreasuryPayment" ADD CONSTRAINT "ErpTreasuryPayment_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "ErpPurchaseReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpTreasuryPayment" ADD CONSTRAINT "ErpTreasuryPayment_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "ErpPaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

