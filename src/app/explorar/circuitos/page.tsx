import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { layoutPadding, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { productTitle } from "@/lib/brand";
import { auth } from "@/auth";
import { Breadcrumb, EmptyState, PageHeader } from "@/components/ui";
import { CircuitReserveForm } from "./CircuitReserveForm";

export const metadata = {
  title: productTitle("Circuitos OOH"),
  description: "Circuitos de espacios publicitarios para cobertura geográfica ampliada.",
};

export default async function CircuitosCatalogoPage() {
  const session = await auth();
  const isAdvertiser = session?.user?.role === "advertiser";

  const circuits = await prisma.circuit.findMany({
    where: { isPublished: true },
    include: {
      provider: { select: { companyName: true } },
      units: {
        include: {
          unit: {
            select: {
              name: true,
              locationLabel: true,
              format: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={cn(pageScroll, layoutPadding, "space-y-8 py-8")}>
      <div className="space-y-3">
        <Breadcrumb items={[{ label: "Catálogo", href: "/explorar" }, { label: "Circuitos" }]} />
        <PageHeader
          description="Paquetes de múltiples espacios agrupados para máxima cobertura geográfica. Contratás todos de una sola vez."
          eyebrow="Circuitos OOH"
          title="Circuitos de cobertura"
        />
      </div>

      {circuits.length === 0 ? (
        <EmptyState
          actionHref="/explorar"
          actionLabel="Ver catálogo individual"
          description="No hay circuitos disponibles en este momento."
          title="Sin circuitos"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {circuits.map((c) => (
            <div key={c.id} className={cn(surfaceCard(), "space-y-4 p-6")}>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{c.name}</h2>
                  {c.totalPrice && (
                    <span className="shrink-0 rounded-[var(--radius-md)] border border-led/30 bg-led/10 px-2.5 py-1 text-sm font-bold text-led">
                      {formatArs(c.totalPrice)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.provider.companyName}</p>
                {c.description && (
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">{c.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.units.length} espacio{c.units.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1.5">
                  {c.units.slice(0, 5).map((cu) => (
                    <div key={cu.id} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-led" />
                      <span className="font-medium text-foreground">{cu.unit.name}</span>
                      <span className="truncate text-muted-foreground">· {cu.unit.locationLabel}</span>
                    </div>
                  ))}
                  {c.units.length > 5 && (
                    <p className="pl-3.5 text-xs text-muted-foreground">
                      +{c.units.length - 5} espacios más
                    </p>
                  )}
                </div>
              </div>

              {isAdvertiser ? (
                <CircuitReserveForm circuitId={c.id} />
              ) : (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    <Link className="font-semibold text-led underline" href="/login">
                      Iniciá sesión
                    </Link>{" "}
                    como anunciante para reservar este circuito.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
