import { prisma } from "../src/lib/prisma";
import { rebuildGestionLinesFromOrders } from "../src/lib/erp-gestion";

async function main() {
  const count = await rebuildGestionLinesFromOrders();
  console.log(`Gestión: ${count} filas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
