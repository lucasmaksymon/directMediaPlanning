import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import { ProgrammaticDealForm } from "./ProgrammaticDealForm";

export const metadata = { title: productTitle("Programática SSP") };

export default async function ProgrammaticPage() {
  await requireOpsSession();

  const deals = await prisma.programmaticDeal.findMany({
    include: { inventoryUnit: { select: { name: true, locationLabel: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">SSP</p>
        <h1 className="font-display mt-1 text-2xl uppercase tracking-wide">Inventario programático</h1>
        <p className="text-sm text-muted-foreground mt-2">
          API OpenRTB: <code className="text-xs">/api/programmatic/openrtb/v2/inventory</code>
        </p>
      </div>

      <ProgrammaticDealForm units={await prisma.inventoryUnit.findMany({
        where: { status: "published" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })} />

      <div className={cn(surfaceCard(), "p-5 space-y-3")}>
        {deals.map((d) => (
          <div key={d.id} className="text-sm border-b border-border pb-2">
            <p className="font-medium">{d.inventoryUnit.name}</p>
            <p className="text-muted-foreground">{d.dealType} · floor {formatArs(d.floorPrice)} · {d.isActive ? "activo" : "pausado"}</p>
          </div>
        ))}
        {deals.length === 0 && <p className="text-muted-foreground text-sm">Sin deals configurados.</p>}
      </div>
    </div>
  );
}
