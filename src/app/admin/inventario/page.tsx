import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import { inventoryStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/cn";

export const metadata = { title: "Inventario · Admin · Direct Planning" };

const statusBadge: Record<string, string> = {
  published: "bg-led/15 text-led",
  draft: "bg-muted text-muted-foreground",
  paused: "bg-signal/15 text-signal",
};

export default async function AdminInventarioPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const units = await prisma.inventoryUnit.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      provider: { select: { companyName: true } },
      _count: { select: { reservations: true } },
    },
  });

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Inventario
        </h1>
        <span className="text-xs text-muted-foreground">{units.length} unidades</span>
      </header>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-border bg-card shadow-sm [scrollbar-gutter:stable]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2 hidden sm:table-cell">Medio</th>
              <th className="px-4 py-2 hidden md:table-cell">Zona</th>
              <th className="px-4 py-2 hidden lg:table-cell">Precio</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 hidden sm:table-cell">Reservas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {units.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  <span className="block truncate max-w-[200px]">{u.name}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{u.provider.companyName}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[180px]">{u.locationLabel}</td>
                <td className="px-4 py-2.5 text-xs tabular-nums text-foreground hidden lg:table-cell">{formatArs(u.basePriceAmount)}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusBadge[u.status] ?? "bg-muted text-muted-foreground")}>
                    {inventoryStatusLabel[u.status] ?? u.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground hidden sm:table-cell">{u._count.reservations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
