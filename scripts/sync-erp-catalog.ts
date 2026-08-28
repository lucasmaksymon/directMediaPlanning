import { prisma } from "../src/lib/prisma";
import { syncErpCatalogFromInventory, syncErpElementsFromCampaigns } from "../src/lib/erp-catalog";

async function main() {
  const plazas = await syncErpCatalogFromInventory();
  const elements = await syncErpElementsFromCampaigns();
  console.log({ plazas, elements });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
