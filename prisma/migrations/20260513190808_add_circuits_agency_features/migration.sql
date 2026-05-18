-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'agency';

-- AlterTable
ALTER TABLE "InventoryUnit" ADD COLUMN     "description" TEXT,
ADD COLUMN     "instantBookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instantBookMaxAmount" DECIMAL(14,2),
ADD COLUMN     "instantBookMinDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastMinuteDiscountPercent" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "lastMinuteEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastMinuteWindowDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Circuit" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalPrice" DECIMAL(14,2),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Circuit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircuitUnit" (
    "id" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CircuitUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "taxId" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyClient" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircuitUnit_circuitId_unitId_key" ON "CircuitUnit"("circuitId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyProfile_userId_key" ON "AgencyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyClient_agencyId_advertiserId_key" ON "AgencyClient"("agencyId", "advertiserId");

-- AddForeignKey
ALTER TABLE "Circuit" ADD CONSTRAINT "Circuit_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitUnit" ADD CONSTRAINT "CircuitUnit_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitUnit" ADD CONSTRAINT "CircuitUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyProfile" ADD CONSTRAINT "AgencyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyClient" ADD CONSTRAINT "AgencyClient_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyClient" ADD CONSTRAINT "AgencyClient_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
