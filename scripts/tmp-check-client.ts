import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const total = await prisma.erpPurchaseOrder.count();
  const conNeto = await prisma.erpPurchaseOrder.count({ where: { net: { gt: 0 } } });
  const desfasadas = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    'SELECT COUNT(*)::bigint AS n FROM "ErpPurchaseOrder" WHERE "net" > 0 AND "grossNet" <> "net"',
  );
  console.log("órdenes de compra totales:", total);
  console.log("con net > 0:", conNeto);
  console.log("con net > 0 pero grossNet distinto de net:", String(desfasadas[0].n));

  const muestra = await prisma.erpPurchaseOrder.findMany({
    where: { net: { gt: 0 } },
    select: { number: true, grossNet: true, net: true },
    take: 5,
  });
  for (const r of muestra) {
    console.log("-", r.number, "| grossNet:", String(r.grossNet), "| net:", String(r.net));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FALLA:", e.message);
  process.exit(1);
});
