import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { btnPrimary, surfaceCard } from "@/lib/ui-classes";
import { formatArs } from "@/lib/format";

export const metadata = { title: "Mis Circuitos OOH · Direct Planning" };

export default async function CircuitosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) redirect("/provider");

  const circuits = await prisma.circuit.findMany({
    where: { providerId: profile.id },
    include: { units: { include: { unit: { select: { name: true, locationLabel: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Circuitos OOH
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{circuits.length} circuito{circuits.length !== 1 ? "s" : ""}</span>
          <Link href="/provider/circuitos/nuevo" className={cn(btnPrimary, "px-3 py-1.5 text-xs")}>
            + Nuevo
          </Link>
        </div>
      </header>

      {circuits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">Aún no creaste circuitos.</p>
          <Link href="/provider/circuitos/nuevo" className="mt-2 inline-block text-xs font-semibold text-led underline">
            Crear primer circuito →
          </Link>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card [scrollbar-gutter:stable]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2 hidden sm:table-cell">Espacios</th>
                <th className="px-4 py-2 hidden md:table-cell">Precio</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {circuits.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.name}</p>
                    {c.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-[240px]">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.units.slice(0, 3).map((cu) => (
                        <span key={cu.id} className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {cu.unit.name}
                        </span>
                      ))}
                      {c.units.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{c.units.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground hidden md:table-cell">
                    {c.totalPrice ? formatArs(c.totalPrice) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-semibold", c.isPublished ? "text-led" : "text-muted-foreground")}>
                      {c.isPublished ? "Publicado" : "Borrador"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/provider/circuitos/${c.id}/editar`}
                      className="text-xs font-semibold text-foreground underline underline-offset-2 hover:text-led transition"
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
