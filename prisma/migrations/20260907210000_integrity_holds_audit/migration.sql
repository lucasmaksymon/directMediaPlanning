-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'hold';

-- AlterTable InventoryUnit indexes
CREATE INDEX IF NOT EXISTS "InventoryUnit_status_idx" ON "InventoryUnit"("status");
CREATE INDEX IF NOT EXISTS "InventoryUnit_providerId_status_idx" ON "InventoryUnit"("providerId", "status");
CREATE INDEX IF NOT EXISTS "InventoryUnit_latitude_longitude_idx" ON "InventoryUnit"("latitude", "longitude");

-- AlterTable Reservation
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "shortCode" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "holdExpiresAt" TIMESTAMP(3);
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "erpSaleOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_shortCode_key" ON "Reservation"("shortCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_erpSaleOrderId_key" ON "Reservation"("erpSaleOrderId");
CREATE INDEX IF NOT EXISTS "Reservation_inventoryUnitId_status_startsAt_endsAt_idx" ON "Reservation"("inventoryUnitId", "status", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "Reservation_holdExpiresAt_idx" ON "Reservation"("holdExpiresAt");

-- CreateTable ReservationEvent
CREATE TABLE IF NOT EXISTS "ReservationEvent" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "ReservationStatus",
    "toStatus" "ReservationStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReservationEvent_reservationId_createdAt_idx" ON "ReservationEvent"("reservationId", "createdAt");

-- CreateTable PasswordResetToken
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- Foreign keys
ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "Reservation_erpSaleOrderId_fkey";
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_erpSaleOrderId_fkey" FOREIGN KEY ("erpSaleOrderId") REFERENCES "ErpSaleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReservationEvent" DROP CONSTRAINT IF EXISTS "ReservationEvent_reservationId_fkey";
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReservationEvent" DROP CONSTRAINT IF EXISTS "ReservationEvent_actorUserId_fkey";
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_userId_fkey";
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
