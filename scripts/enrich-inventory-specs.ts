/**
 * Corrige locationLabel/name contaminados en DB + re-enriquece metadata.
 *
 * Uso: npx tsx scripts/enrich-inventory-specs.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  cleanInventoryUnitName,
  cleanLocationLabel,
  enrichMetadataWithSpecs,
  locationLabelTail,
} from "../src/lib/inventory/unit-specs";

const prisma = new PrismaClient();

async function main() {
  const units = await prisma.inventoryUnit.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      locationLabel: true,
      format: true,
      latitude: true,
      longitude: true,
      metadata: true,
    },
  });

  let updated = 0;
  for (const u of units) {
    const locationLabel = cleanLocationLabel(u.locationLabel) || u.locationLabel;
    const name = cleanInventoryUnitName(u.name) || u.name;
    const tail = locationLabelTail(u.locationLabel);
    let description = (u.description || "").trim();
    if (tail) {
      if (!description) description = tail;
      else if (!description.includes(tail.slice(0, Math.min(40, tail.length)))) {
        description = `${description}\n${tail}`.trim();
      }
    }

    const nextMeta = enrichMetadataWithSpecs(u.metadata, {
      name,
      description,
      locationLabel,
      format: u.format,
      latitude: u.latitude,
      longitude: u.longitude,
      metadata: u.metadata,
    });

    const changed =
      locationLabel !== u.locationLabel ||
      name !== u.name ||
      description !== (u.description || "").trim() ||
      JSON.stringify(u.metadata ?? {}) !== JSON.stringify(nextMeta);

    if (!changed) continue;

    await prisma.inventoryUnit.update({
      where: { id: u.id },
      data: {
        locationLabel: locationLabel.slice(0, 240),
        name: name.slice(0, 200),
        description: description || null,
        metadata: nextMeta,
      },
    });
    updated++;
  }

  console.log(`Unidades: ${units.length} · actualizadas: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
