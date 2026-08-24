-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('direct', 'agency');

-- AlterTable
ALTER TABLE "AgencyProfile" ADD COLUMN     "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 15,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "InventoryUnit" ADD COLUMN     "agencyPriceAmount" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "commissionAmount" DECIMAL(14,2),
ADD COLUMN     "priceType" "PriceType" NOT NULL DEFAULT 'direct';

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
