import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { adminPage, btnPrimary, surfaceCard, tableScroll } from "@/lib/ui-classes";
import { formatArs } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: productTitle("Circuitos OOH") };

export default async function CircuitosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const circuits = await prisma.circuit.findMany({
    include: {
      provider: { select: { companyName: true } },
      units: { include: { unit: { select: { name: true, locationLabel: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={cn(adminPage, "gap-3")}>
      <PageHeader
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {circuits.length} circuito{circuits.length !== 1 ? "s" : ""}
            </span>
            <Link
              className={cn(btnPrimary, "px-3 py-1.5 text-xs")}
              href="/admin/operaciones/circuitos/nuevo"
            >
              + Nuevo
            </Link>
          </div>
        }
        title="Circuitos OOH"
      />

      {circuits.length === 0 ? (
        <EmptyState
          actionHref="/admin/operaciones/circuitos/nuevo"
          actionLabel="Crear primer circuito"
          description="Aún no creaste circuitos."
          title="Sin circuitos"
        />
      ) : (
        <div className={cn(surfaceCard(), tableScroll, "min-h-0 flex-1")}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Nombre</th>
                <th className="hidden px-4 py-2 sm:table-cell">Espacios</th>
                <th className="hidden px-4 py-2 md:table-cell">Precio</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {circuits.map((c) => (
                <tr key={c.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.name}</p>
                    {c.description && (
                      <p className="mt-0.5 max-w-[240px] truncate text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.units.slice(0, 3).map((cu) => (
                        <span
                          key={cu.id}
                          className="rounded-[var(--radius-md)] border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {cu.unit.name}
                        </span>
                      ))}
                      {c.units.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{c.units.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-foreground md:table-cell">
                    {c.totalPrice ? formatArs(c.totalPrice) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        c.isPublished ? "text-led" : "text-muted-foreground",
                      )}
                    >
                      {c.isPublished ? "Publicado" : "Borrador"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-xs font-semibold text-foreground underline underline-offset-2 transition hover:text-led"
                      href={`/admin/operaciones/circuitos/${c.id}/editar`}
                    >
                      Editar
                    </Link>
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
