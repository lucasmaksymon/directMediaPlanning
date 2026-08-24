-- Platform settings
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "platformFeeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.06,
    "freemiumMaxScreens" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformSettings" ("id", "platformFeeRate", "freemiumMaxScreens", "updatedAt")
VALUES ('default', 0.06, 10, CURRENT_TIMESTAMP);

-- Organization (multi-tenant / freemium)
CREATE TYPE "OrganizationPlan" AS ENUM ('freemium', 'pro', 'enterprise');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'freemium',
    "maxScreens" INTEGER NOT NULL DEFAULT 10,
    "countryCode" TEXT NOT NULL DEFAULT 'AR',
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

ALTER TABLE "ProviderProfile" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Campaign
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled');

CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "budget" DECIMAL(14,2),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_advertiserId_fkey"
    FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Creative assets
CREATE TABLE "CreativeAsset" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreativeAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreativeAsset_advertiserId_idx" ON "CreativeAsset"("advertiserId");
CREATE INDEX "CreativeAsset_campaignId_idx" ON "CreativeAsset"("campaignId");
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_advertiserId_fkey"
    FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reservation extensions
ALTER TABLE "Reservation" ADD COLUMN "circuitId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "platformFeeAmount" DECIMAL(14,2);

CREATE INDEX "Reservation_campaignId_idx" ON "Reservation"("campaignId");
CREATE INDEX "Reservation_circuitId_idx" ON "Reservation"("circuitId");
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_circuitId_fkey"
    FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payments
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'rejected', 'refunded');

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "platformFee" DECIMAL(14,2) NOT NULL,
    "providerAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "mercadoPagoPreferenceId" TEXT,
    "mercadoPagoPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_reservationId_key" ON "Payment"("reservationId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Proof of play
CREATE TYPE "PoPStatus" AS ENUM ('pending', 'submitted', 'verified', 'rejected');

CREATE TABLE "ProofOfPlay" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "notes" TEXT,
    "status" "PoPStatus" NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProofOfPlay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProofOfPlay_reservationId_key" ON "ProofOfPlay"("reservationId");
ALTER TABLE "ProofOfPlay" ADD CONSTRAINT "ProofOfPlay_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Publication orders
CREATE TYPE "PublicationOrderStatus" AS ENUM ('draft', 'sent', 'in_progress', 'completed', 'cancelled');

CREATE TABLE "PublicationOrder" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "creativeAssetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PublicationOrderStatus" NOT NULL DEFAULT 'draft',
    "instructions" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicationOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicationOrder_reservationId_key" ON "PublicationOrder"("reservationId");
ALTER TABLE "PublicationOrder" ADD CONSTRAINT "PublicationOrder_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicationOrder" ADD CONSTRAINT "PublicationOrder_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CMS: screens, playlists, play logs
CREATE TYPE "ScreenPlatform" AS ENUM ('android', 'web', 'tizen', 'other');

CREATE TABLE "Screen" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "inventoryUnitId" TEXT,
    "name" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "platform" "ScreenPlatform" NOT NULL DEFAULT 'web',
    "lastHeartbeat" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Screen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Screen_inventoryUnitId_key" ON "Screen"("inventoryUnitId");
CREATE UNIQUE INDEX "Screen_deviceKey_key" ON "Screen"("deviceKey");
CREATE INDEX "Screen_providerId_idx" ON "Screen"("providerId");
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_inventoryUnitId_fkey"
    FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "screenId" TEXT,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Playlist_providerId_idx" ON "Playlist"("providerId");
CREATE INDEX "Playlist_screenId_idx" ON "Playlist"("screenId");
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_screenId_fkey"
    FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlaylistItem" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "creativeUrl" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlaylistItem_playlistId_idx" ON "PlaylistItem"("playlistId");
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_fkey"
    FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlayLog" (
    "id" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "creativeUrl" TEXT NOT NULL,
    "playlistItemId" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER,
    CONSTRAINT "PlayLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayLog_screenId_playedAt_idx" ON "PlayLog"("screenId", "playedAt");
ALTER TABLE "PlayLog" ADD CONSTRAINT "PlayLog_screenId_fkey"
    FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audience reports
CREATE TABLE "AudienceReport" (
    "id" TEXT NOT NULL,
    "inventoryUnitId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudienceReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AudienceReport_inventoryUnitId_periodStart_idx" ON "AudienceReport"("inventoryUnitId", "periodStart");
ALTER TABLE "AudienceReport" ADD CONSTRAINT "AudienceReport_inventoryUnitId_fkey"
    FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Programmatic / SSP
CREATE TYPE "DealType" AS ENUM ('open', 'pmp', 'programmatic_guaranteed');

CREATE TABLE "ProgrammaticDeal" (
    "id" TEXT NOT NULL,
    "inventoryUnitId" TEXT NOT NULL,
    "dealType" "DealType" NOT NULL DEFAULT 'open',
    "floorPrice" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openRtbUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProgrammaticDeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProgrammaticDeal_inventoryUnitId_isActive_idx" ON "ProgrammaticDeal"("inventoryUnitId", "isActive");
ALTER TABLE "ProgrammaticDeal" ADD CONSTRAINT "ProgrammaticDeal_inventoryUnitId_fkey"
    FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SlotAvailability" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "slotEnd" TIMESTAMP(3) NOT NULL,
    "state" "SlotState" NOT NULL DEFAULT 'available',
    CONSTRAINT "SlotAvailability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SlotAvailability_unitId_slotStart_slotEnd_idx" ON "SlotAvailability"("unitId", "slotStart", "slotEnd");
ALTER TABLE "SlotAvailability" ADD CONSTRAINT "SlotAvailability_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
