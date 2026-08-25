/**
 * Enriquece metadata de InventoryUnit con specs separadas
 * (medida, visibilidad, caras, impacto, frecuencia, spot, mapsUrl)
 * parseadas desde name/description/metadata existentes.
 *
 * Uso: npx tsx scripts/enrich-inventory-specs.ts
 */
import { PrismaClient } from "@prisma/client";
import { enrichMetadataWithSpecs } from "../src/lib/inventory/unit-specs";

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
    const next = enrichMetadataWithSpecs(u.metadata, u);
    const prev = JSON.stringify(u.metadata ?? {});
    const after = JSON.stringify(next);
    if (prev === after) continue;
    await prisma.inventoryUnit.update({
      where: { id: u.id },
      data: { metadata: next },
    });
    updated++;
  }

  console.log(`Unidades: ${units.length} · metadata enriquecida: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
