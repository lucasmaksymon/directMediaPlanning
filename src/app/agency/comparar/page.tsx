import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { btnPrimary, panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { productTitle } from "@/lib/brand";

export const metadata = { title: productTitle("Comparar espacios") };

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital OOH",
  static_ooh: "OOH Estático",
  digital_package: "Paquete Digital",
};

export default async function AgencyCompararPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "agency" && session.user.role !== "admin")) {
    redirect("/");
  }

  const agencyProfile = await prisma.agencyProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, commissionPct: true, companyName: true },
  });

  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "").split(",").filter(Boolean).slice(0, 5);

  const units =
    ids.length > 0
      ? await prisma.inventoryUnit.findMany({
          where: { id: { in: ids }, status: "published" },
        })
      : await prisma.inventoryUnit.findMany({
          where: { status: "published" },
          take: 4,
          orderBy: { basePriceAmount: "asc" },
        });

  const commissionPct = agencyProfile ? Number(agencyProfile.commissionPct) / 100 : 0.15;

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Agencia</p>
          <h1 className="font-display mt-1 text-2xl font-normal uppercase tracking-wide text-foreground">
            Comparar espacios
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Visualizá precios directos vs. precios de agencia y la comisión estimada para cada espacio.
          </p>
        </div>
        <Link href="/explorar" className={cn(btnPrimary, "text-xs px-5 py-2.5")}>
          + Agregar espacios
        </Link>
      </div>

      {/* Leyenda */}
      {agencyProfile && (
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">Precio directo (sin agencia)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-led/70" />
            <span className="text-muted-foreground">Precio vía {agencyProfile.companyName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-primary/70" />
            <span className="text-muted-foreground">Tu comisión ({Number(agencyProfile.commissionPct)}%)</span>
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <div className={cn(surfaceCard(), "p-10 text-center")}>
          <p className="text-muted-foreground">No hay espacios para comparar.</p>
          <Link href="/explorar" className="mt-4 inline-block text-sm font-semibold text-led underline">
            Explorar catálogo →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {units.map((u) => {
            const directPrice = Number(u.basePriceAmount);
            const agencyPrice = u.agencyPriceAmount
              ? Number(u.agencyPriceAmount)
              : directPrice * (1 - commissionPct);
            const commission = directPrice - agencyPrice;
            const savingsPct = Math.round(((directPrice - agencyPrice) / directPrice) * 100);

            return (
              <div key={u.id} className={cn(surfaceCard(), "p-5 space-y-4")}>
                <div>
                  <p className="font-semibold text-foreground">{u.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{u.locationLabel}</p>
                  <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {formatLabels[u.format] ?? u.format}
                  </span>
                </div>

                <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Precio directo</span>
                    <span className="font-medium line-through text-muted-foreground/70">
                      {formatArs(directPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">Precio vía agencia</span>
                    <span className="font-bold text-led">{formatArs(agencyPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Tu comisión</span>
                    <span className="font-semibold text-primary">{formatArs(commission)}</span>
                  </div>
                  <div className="text-center">
                    <span className="rounded-full bg-led/15 px-3 py-1 text-xs font-bold text-led">
                      Ahorro anunciante: {savingsPct}%
                    </span>
                  </div>
                </div>

                <Link
                  href={`/explorar/${u.id}`}
                  className="block w-full rounded-full border border-led/40 py-2 text-center text-xs font-bold uppercase tracking-wide text-led transition hover:bg-led/10"
                >
                  Ver detalle
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla resumen si hay múltiples */}
      {units.length > 1 && (
        <div className={cn(surfaceCard(), "overflow-hidden")}>
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tabla comparativa
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 text-left">Espacio</th>
                  <th className="px-5 py-3 text-right">Precio directo</th>
                  <th className="px-5 py-3 text-right">Precio agencia</th>
                  <th className="px-5 py-3 text-right">Tu comisión</th>
                  <th className="px-5 py-3 text-right">Ahorro cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {units.map((u) => {
                  const directPrice = Number(u.basePriceAmount);
                  const agencyPrice = u.agencyPriceAmount
                    ? Number(u.agencyPriceAmount)
                    : directPrice * (1 - commissionPct);
                  const commission = directPrice - agencyPrice;
                  const savingsPct = Math.round(((directPrice - agencyPrice) / directPrice) * 100);
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.locationLabel}</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground line-through">
                        {formatArs(directPrice)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-led">
                        {formatArs(agencyPrice)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-primary">
                        {formatArs(commission)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="rounded-full bg-led/15 px-2.5 py-0.5 text-xs font-bold text-led">
                          {savingsPct}% menos
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
