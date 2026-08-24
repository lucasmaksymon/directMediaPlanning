import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { inventoryStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { adminPage, btnPrimary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

const statusDot: Record<string, string> = {
  published: "bg-led",
  draft: "bg-muted-foreground",
  paused: "bg-signal",
};

export default async function ProviderInventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const units = await prisma.inventoryUnit.findMany({
    orderBy: { updatedAt: "desc" },
    include: { provider: { select: { companyName: true } } },
  });

  return (
    <div className={cn(adminPage, "gap-3")}>
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Inventario
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{units.length} unidades</span>
          <Link className={cn(btnPrimary, "px-3 py-1.5 text-xs")} href="/admin/operaciones/inventory/new">
            + Nueva unidad
          </Link>
        </div>
      </header>

      {units.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center text-sm text-muted-foreground">
          Aún no hay espacios cargados.{" "}
          <Link className="font-semibold text-foreground underline" href="/admin/operaciones/inventory/new">
            Crear primera unidad
          </Link>
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card shadow-sm [scrollbar-gutter:stable]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2 hidden sm:table-cell">Proveedor</th>
                <th className="px-4 py-2 hidden sm:table-cell">Ubicación</th>
                <th className="px-4 py-2 hidden md:table-cell">Precio base</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.id} className="group transition hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-tight">{u.name}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-xs text-muted-foreground truncate max-w-[140px]">{u.provider.companyName}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{u.locationLabel}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                    <p className="text-xs font-semibold text-foreground">{formatArs(u.basePriceAmount)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[u.status] ?? "bg-muted-foreground")} />
                      {inventoryStatusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        className="text-xs font-semibold text-muted-foreground hover:text-led transition underline underline-offset-2"
                        href={`/admin/operaciones/inventory/${u.id}/disponibilidad`}
                      >
                        Calendario
                      </Link>
                      <Link
                        className="text-xs font-semibold text-foreground hover:text-led transition underline underline-offset-2"
                        href={`/admin/operaciones/inventory/${u.id}/edit`}
                      >
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
