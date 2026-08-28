/**
 * Completa impacto faltante en inventario (misma lógica del catálogo) y lo persiste.
 * Uso: npx tsx scripts/backfill-impacto.ts
 */
import { PrismaClient } from "@prisma/client";
import { ensureInventoryImpacto } from "../src/lib/inventory/estimate-impacto";

const prisma = new PrismaClient();

async function main() {
  const units = await prisma.inventoryUnit.findMany({
    select: { id: true, name: true, metadata: true },
    orderBy: { name: "asc" },
  });

  let filled = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of units) {
    const meta = u.metadata && typeof u.metadata === "object" ? (u.metadata as Record<string, string>) : {};
    if (String(meta.impacto ?? "").trim()) {
      skipped++;
      continue;
    }
    try {
      const res = await ensureInventoryImpacto(u.id);
      if (res) {
        filled++;
        console.log(`OK ${res.source} ${res.impacto} — ${u.name.slice(0, 70)}`);
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      console.warn("FAIL", u.name, e);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`Listo. Completados: ${filled} · ya tenían: ${skipped} · fallidos: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
