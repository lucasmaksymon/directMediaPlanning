-- AlterTable
ALTER TABLE "ErpSaleOrder" ADD COLUMN "product" TEXT;
ALTER TABLE "ErpSaleOrder" ADD COLUMN "plaza" TEXT;
ALTER TABLE "ErpSaleOrder" ADD COLUMN "periodLabel" TEXT;
ALTER TABLE "ErpSaleOrder" ADD COLUMN "observations" TEXT;
ALTER TABLE "ErpSaleOrder" ADD COLUMN "agencyFee" DECIMAL(8,4);

-- AlterTable
ALTER TABLE "ErpCampaignItem" ADD COLUMN "plaza" TEXT;
ALTER TABLE "ErpCampaignItem" ADD COLUMN "days" INTEGER;
ALTER TABLE "ErpCampaignItem" ADD COLUMN "faces" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpCampaignItem" ADD COLUMN "measures" TEXT;
ALTER TABLE "ErpCampaignItem" ADD COLUMN "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpCampaignItem" ADD COLUMN "exhibitionNet" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpCampaignItem" ADD COLUMN "bonusNet" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpCampaignItem" ADD COLUMN "productionNet" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "product" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "media" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "measures" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "locations" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "endsAt" TIMESTAMP(3);
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "paidQty" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "bonusQty" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "observations" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "printShop" TEXT;
ALTER TABLE "ErpPurchaseOrder" ADD COLUMN "printSupport" TEXT;

-- AlterTable
ALTER TABLE "ErpProductionOrder" ADD COLUMN "product" TEXT;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "measures" TEXT;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "printSupport" TEXT;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "motifs" TEXT;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "invoiceDetail" TEXT;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "observations" TEXT;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "pickup" TEXT;
ALTER TABLE "ErpProductionOrder" ADD COLUMN "colorProof" TEXT;

-- CreateTable
CREATE TABLE "ErpPurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "location" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "days" INTEGER,
    "measures" TEXT,
    "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpProductionOrderItem" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "location" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "measures" TEXT,
    "printSupport" TEXT,
    "net" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpProductionOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpProductionDelivery" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpProductionDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErpPurchaseOrderItem_purchaseOrderId_idx" ON "ErpPurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "ErpProductionOrderItem_productionOrderId_idx" ON "ErpProductionOrderItem"("productionOrderId");

-- CreateIndex
CREATE INDEX "ErpProductionDelivery_productionOrderId_idx" ON "ErpProductionDelivery"("productionOrderId");

-- AddForeignKey
ALTER TABLE "ErpPurchaseOrderItem" ADD CONSTRAINT "ErpPurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "ErpPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpProductionOrderItem" ADD CONSTRAINT "ErpProductionOrderItem_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ErpProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpProductionDelivery" ADD CONSTRAINT "ErpProductionDelivery_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ErpProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
