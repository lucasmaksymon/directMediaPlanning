import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function size() {
  const rows = await prisma.$queryRawUnsafe<
    { tabla: string; filas: bigint; tamano: string }[]
  >(`
    SELECT c.relname AS tabla,
           c.reltuples::bigint AS filas,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS tamano
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 25
  `);
  console.log("=== TABLAS MÁS GRANDES ===");
  for (const r of rows) {
    console.log(String(r.filas).padStart(9), r.tamano.padStart(10), " ", r.tabla);
  }
}

async function time(label: string, fn: () => Promise<unknown>) {
  const t0 = performance.now();
  const out = await fn();
  const ms = performance.now() - t0;
  const n = Array.isArray(out) ? ` (${out.length} filas)` : "";
  console.log(`${ms.toFixed(0).padStart(6)} ms  ${label}${n}`);
  return ms;
}

async function main() {
  await size();

  console.log("\n=== CONSULTAS DE /backoffice/ordenes/compra ===");
  const t0 = performance.now();
  await Promise.all([
    time("purchaseOrder.findMany take 200 + vendor + saleOrder + items + adjustments", () =>
      prisma.erpPurchaseOrder.findMany({
        orderBy: { issuedAt: "desc" },
        include: {
          vendor: { select: { name: true } },
          saleOrder: { select: { number: true, product: true, client: { select: { name: true } } } },
          items: true,
          adjustments: { orderBy: { sortOrder: "asc" } },
        },
        take: 200,
      }),
    ),
    time("saleOrder.findMany take 200 + client", () =>
      prisma.erpSaleOrder.findMany({
        orderBy: { issuedAt: "desc" },
        include: { client: { select: { name: true } } },
        take: 200,
      }),
    ),
    time("vendor.findMany (medios activos)", () =>
      prisma.erpVendor.findMany({ where: { estado: 1, kind: 0 }, orderBy: { name: "asc" } }),
    ),
    time("element.findMany", () =>
      prisma.erpElement.findMany({ where: { estado: 1 }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ),
    time("province.findMany + cities", () =>
      prisma.erpProvince.findMany({
        where: { estado: 1 },
        orderBy: { name: "asc" },
        include: { cities: { where: { estado: 1 }, orderBy: { name: "asc" } } },
      }),
    ),
  ]);
  console.log(`${(performance.now() - t0).toFixed(0).padStart(6)} ms  >>> TOTAL página compra (en paralelo)`);

  console.log("\n=== EXPLAIN de la consulta principal de compra ===");
  const plan = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
    `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "ErpPurchaseOrder" ORDER BY "issuedAt" DESC LIMIT 200`,
  );
  for (const p of plan) console.log("  ", p["QUERY PLAN"]);

  console.log("\n=== ÍNDICES existentes en tablas Erp principales ===");
  const idx = await prisma.$queryRawUnsafe<{ tablename: string; indexdef: string }[]>(`
    SELECT tablename, indexdef FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('ErpPurchaseOrder','ErpSaleOrder','ErpProductionOrder','ErpSaleInvoice','ErpPurchaseInvoice','ErpGestionLine','ErpCampaignItem')
    ORDER BY tablename, indexname
  `);
  for (const i of idx) console.log("  ", i.tablename, "->", i.indexdef.replace(/^CREATE .*INDEX /, ""));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FALLA:", e);
  process.exit(1);
});
