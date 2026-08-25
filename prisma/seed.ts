/**
 * NextPlanning — seed de producción / bootstrap
 *
 * Requisitos:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *   SEED_RESET=true   (obligatorio para borrar y recrear)
 *
 * Antes (opcional): npx tsx scripts/import-drive-kits.ts
 *   → genera prisma/data/drive-inventory.json + public/inventory/*
 *
 * Ejecutar: SEED_RESET=true npm run db:seed
 */
import * as fs from "fs";
import * as path from "path";
import {
  InventoryFormat,
  InventoryStatus,
  PriceModel,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { enrichMetadataWithSpecs, cleanLocationLabel, cleanInventoryUnitName, locationLabelTail } from "../src/lib/inventory/unit-specs";

const prisma = new PrismaClient();

function d(amount: string | number) {
  return new Prisma.Decimal(amount);
}

/** Proveedores reales — carpetas Media Kits 2026. */
const PROVIDERS: { companyName: string; description: string }[] = [
  { companyName: "ATACAMA", description: "Parque OOH — media kit 2026." },
  { companyName: "BAMBU", description: "Parque OOH — media kit 2026." },
  { companyName: "BAMP", description: "Parque OOH — media kit 2026." },
  { companyName: "BBYMC", description: "Parque OOH — media kit 2026." },
  { companyName: "BILLBOARD", description: "Parque OOH — media kit 2026." },
  { companyName: "BRAND PLUS", description: "Parque OOH — media kit 2026." },
  { companyName: "CITY MEDIA", description: "Parque OOH — media kit 2026." },
  { companyName: "DA3", description: "Parque OOH — media kit 2026." },
  { companyName: "DELFINO", description: "Parque OOH — media kit 2026." },
  { companyName: "ENVISION", description: "Parque OOH — media kit 2026." },
  { companyName: "ESTO ES / VURKINA", description: "Parque OOH — media kit 2026." },
  { companyName: "FILIPPO", description: "Parque OOH — media kit 2026." },
  { companyName: "GLOBAL", description: "Parque OOH — media kit 2026." },
  { companyName: "IDEAS CREATIVAS", description: "Parque OOH — media kit 2026." },
  { companyName: "LITORAL", description: "Parque OOH — media kit 2026." },
  { companyName: "MASA IDEAS", description: "Parque OOH — media kit 2026." },
  { companyName: "MEDIA 500", description: "Parque OOH — media kit 2026." },
  { companyName: "METROPOLI PUBLICIDAD", description: "Parque OOH — media kit 2026." },
  { companyName: "NE3 Publicidad", description: "Parque OOH — media kit 2026." },
  { companyName: "NEXO", description: "Parque OOH — media kit 2026." },
  { companyName: "OMB VIA PUBLICA", description: "Parque OOH — media kit 2026." },
  { companyName: "PC Carnevale", description: "Parque OOH — media kit 2026." },
  { companyName: "PUBLICAR", description: "Parque OOH — media kit 2026." },
  { companyName: "PUBLICITAR", description: "Parque OOH — media kit 2026." },
  { companyName: "ROMAN", description: "Parque OOH — media kit 2026." },
  { companyName: "SKY MEDIA", description: "Parque OOH — media kit 2026." },
  { companyName: "TOP VIEW", description: "Parque OOH — media kit 2026." },
  { companyName: "VIACART", description: "Parque OOH — media kit 2026." },
  { companyName: "VOLMEDIA", description: "Parque OOH — media kit 2026." },
  { companyName: "WALLSTREET", description: "Parque OOH — media kit 2026." },
];

type DriveUnit = {
  providerName: string;
  name: string;
  locationLabel: string;
  description: string;
  format: "digital_ooh" | "static_ooh" | "digital_package";
  basePriceAmount: string;
  priceModel: "fixed_list" | "negotiable" | "package";
  status: "published" | "draft";
  imagePath: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, string>;
};

function loadDriveInventory(): DriveUnit[] {
  const p = path.join(__dirname, "data", "drive-inventory.json");
  if (!fs.existsSync(p)) {
    console.warn("Sin prisma/data/drive-inventory.json — solo proveedores. Corré: npm run import:drive");
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as { units: DriveUnit[] };
  return raw.units ?? [];
}

async function clearAll() {
  await prisma.playLog.deleteMany();
  await prisma.playlistItem.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.slotAvailability.deleteMany();
  await prisma.programmaticDeal.deleteMany();
  await prisma.audienceReport.deleteMany();
  await prisma.publicationOrder.deleteMany();
  await prisma.proofOfPlay.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.creativeAsset.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.circuitUnit.deleteMany();
  await prisma.circuit.deleteMany();
  await prisma.inventoryUnit.deleteMany();
  await prisma.agencyClient.deleteMany();
  await prisma.agencyProfile.deleteMany();
  await prisma.advertiserProfile.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const reset = process.env.SEED_RESET === "true";

  if (!reset) {
    throw new Error(
      "Seed abortado: seteá SEED_RESET=true para borrar y recrear la base. " +
        "Ejemplo: SEED_RESET=true SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed",
    );
  }

  if (!adminEmail || !adminPassword) {
    throw new Error("Seed abortado: faltan SEED_ADMIN_EMAIL y/o SEED_ADMIN_PASSWORD.");
  }

  if (adminPassword.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  }

  const driveUnits = loadDriveInventory();

  console.log("Limpiando base…");
  await clearAll();

  const passwordHash = await hash(adminPassword, 10);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      role: UserRole.admin,
      passwordHash,
    },
  });
  console.log(`Admin: ${admin.email}`);

  const providerIds = new Map<string, string>();

  for (const p of PROVIDERS) {
    const row = await prisma.providerProfile.create({
      data: {
        companyName: p.companyName,
        description: p.description,
      },
    });
    providerIds.set(p.companyName, row.id);
  }

  // Ensure any provider names from JSON exist
  for (const u of driveUnits) {
    if (!providerIds.has(u.providerName)) {
      const row = await prisma.providerProfile.create({
        data: {
          companyName: u.providerName,
          description: "Parque OOH — media kit 2026.",
        },
      });
      providerIds.set(u.providerName, row.id);
    }
  }

  const formatMap = {
    digital_ooh: InventoryFormat.digital_ooh,
    static_ooh: InventoryFormat.static_ooh,
    digital_package: InventoryFormat.digital_package,
  };
  const priceMap = {
    fixed_list: PriceModel.fixed_list,
    negotiable: PriceModel.negotiable,
    package: PriceModel.package,
  };
  const statusMap = {
    published: InventoryStatus.published,
    draft: InventoryStatus.draft,
  };

  let created = 0;
  const batch: Prisma.InventoryUnitCreateManyInput[] = [];
  for (const u of driveUnits) {
    const providerId = providerIds.get(u.providerName);
    if (!providerId) continue;
    const locationLabel = cleanLocationLabel(u.locationLabel) || u.locationLabel.slice(0, 240);
    const name = cleanInventoryUnitName(u.name) || u.name.slice(0, 200);
    const tail = locationLabelTail(u.locationLabel);
    let description = (u.description || "").trim();
    if (tail && !description) {
      description = tail;
    } else if (tail && description && !description.includes(tail.slice(0, 40))) {
      description = `${description}\n${tail}`.trim();
    }
    batch.push({
      providerId,
      name: name.slice(0, 200),
      format: formatMap[u.format] ?? InventoryFormat.static_ooh,
      locationLabel: locationLabel.slice(0, 240),
      description: description || null,
      basePriceAmount: d(u.basePriceAmount || "1"),
      currency: "ARS",
      priceModel: priceMap[u.priceModel] ?? PriceModel.negotiable,
      status: statusMap[u.status] ?? InventoryStatus.draft,
      imageUrls: u.imagePath ? [u.imagePath] : [],
      latitude: u.latitude ?? undefined,
      longitude: u.longitude ?? undefined,
      metadata: enrichMetadataWithSpecs(u.metadata ?? {}, {
        name,
        description,
        locationLabel,
        format: u.format,
        latitude: u.latitude,
        longitude: u.longitude,
        metadata: u.metadata,
      }),
    });
    created++;
    if (batch.length >= 100) {
      await prisma.inventoryUnit.createMany({ data: batch });
      batch.length = 0;
    }
  }
  if (batch.length) await prisma.inventoryUnit.createMany({ data: batch });

  console.log(`Proveedores: ${providerIds.size}`);
  console.log(`Unidades desde Drive: ${created}`);
  console.log("Seed OK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
