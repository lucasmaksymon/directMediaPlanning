/**
 * Carga prisma/data/dispo-inventory.json en la DB (sin wipe).
 * Uso: npx tsx scripts/import-dispo.ts
 */
import * as fs from "fs";
import * as path from "path";
import { InventoryFormat, InventoryStatus, PriceModel, Prisma, PrismaClient, SlotState } from "@prisma/client";
import { enrichMetadataWithSpecs } from "../src/lib/inventory/unit-specs";

const prisma = new PrismaClient();
const JSON_PATH = path.join(process.cwd(), "prisma", "data", "dispo-inventory.json");
const SOURCE = "dispo-agosto-2026";

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

type DispoUnit = {
  providerName: string;
  name: string;
  locationLabel: string;
  description: string;
  format: "digital_ooh" | "static_ooh" | "digital_package";
  basePriceAmount: string;
  priceModel: "fixed_list" | "negotiable" | "package";
  status: "published" | "draft";
  imagePath: string | null;
  metadata?: Record<string, string>;
  disponibleEn?: string;
};

function d(amount: string | number) {
  return new Prisma.Decimal(amount);
}

function availableFrom(label?: string): Date {
  const key = (label || "agosto").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const month = MONTHS[key] ?? 7;
  return new Date(Date.UTC(2026, month, 1));
}

function availableUntil(): Date {
  return new Date(Date.UTC(2027, 7, 31, 23, 59, 59));
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error("Falta prisma/data/dispo-inventory.json. Corré: python scripts/parse-dispo-pdfs.py");
  }
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as { units: DispoUnit[] };
  const units = raw.units ?? [];
  if (!units.length) throw new Error("El JSON de dispo no tiene unidades.");

  const providerNames = [...new Set(units.map((u) => u.providerName))];
  const providerIds = new Map<string, string>();

  for (const name of providerNames) {
    const existing = await prisma.providerProfile.findFirst({ where: { companyName: name } });
    if (existing) {
      providerIds.set(name, existing.id);
      continue;
    }
    const created = await prisma.providerProfile.create({
      data: { companyName: name, description: "Parque OOH — disponibilidad agosto 2026." },
    });
    providerIds.set(name, created.id);
    console.log(`Proveedor creado: ${name}`);
  }

  const providerIdList = [...providerIds.values()];
  const stale = await prisma.inventoryUnit.findMany({
    where: { providerId: { in: providerIdList } },
    select: { id: true, metadata: true },
  });
  const staleIds = stale
    .filter((u) => {
      const meta = u.metadata && typeof u.metadata === "object" ? (u.metadata as Record<string, string>) : {};
      return meta.source === SOURCE;
    })
    .map((u) => u.id);

  if (staleIds.length) {
    await prisma.availabilityBlock.deleteMany({ where: { unitId: { in: staleIds } } });
    await prisma.inventoryUnit.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`Reemplazo ${staleIds.length} unidades previas de esta dispo.`);
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

  let created = 0;
  for (const u of units) {
    const providerId = providerIds.get(u.providerName);
    if (!providerId) continue;
    const metadata = enrichMetadataWithSpecs(
      { ...(u.metadata ?? {}), source: SOURCE, pauta: u.metadata?.pauta || "Mensual" },
      {
        name: u.name,
        description: u.description,
        locationLabel: u.locationLabel,
        format: u.format,
        metadata: u.metadata,
      },
    );

    const row = await prisma.inventoryUnit.create({
      data: {
        providerId,
        name: u.name.slice(0, 200),
        format: formatMap[u.format] ?? InventoryFormat.static_ooh,
        locationLabel: u.locationLabel.slice(0, 240),
        description: u.description || null,
        basePriceAmount: d(u.basePriceAmount || "1"),
        currency: "ARS",
        priceModel: priceMap[u.priceModel] ?? PriceModel.negotiable,
        status: InventoryStatus.published,
        imageUrls: u.imagePath ? [u.imagePath] : [],
        metadata,
      },
    });

    const startsAt = availableFrom(u.disponibleEn || u.metadata?.disponibleEn);
    await prisma.availabilityBlock.create({
      data: {
        unitId: row.id,
        startsAt,
        endsAt: availableUntil(),
        state: SlotState.available,
      },
    });
    created++;
  }

  console.log(`OK: ${created} unidades publicadas (${providerNames.join(", ")}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
