import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import { EmptyState, PageHeader } from "@/components/ui";
import { ProgrammaticDealForm } from "./ProgrammaticDealForm";

export const metadata = { title: productTitle("Programática SSP") };

export default async function ProgrammaticPage() {
  await requireOpsSession();

  const deals = await prisma.programmaticDeal.findMany({
    include: { inventoryUnit: { select: { name: true, locationLabel: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const units = await prisma.inventoryUnit.findMany({
    where: { status: "published" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader
        description={
          <>
            API OpenRTB: <code className="text-xs">/api/programmatic/openrtb/v2/inventory</code>
          </>
        }
        eyebrow="SSP"
        title="Inventario programático"
      />

      <ProgrammaticDealForm units={units} />

      <div className={cn(surfaceCard(), "space-y-3 p-5")}>
        {deals.length === 0 ? (
          <EmptyState description="Sin deals configurados." title="Sin deals" />
        ) : (
          deals.map((d) => (
            <div key={d.id} className="border-b border-border pb-2 text-sm">
              <p className="font-medium">{d.inventoryUnit.name}</p>
              <p className="text-muted-foreground">
                {d.dealType} · floor {formatArs(d.floorPrice)} · {d.isActive ? "activo" : "pausado"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
