import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";

export const metadata = {
  title: "Circuitos OOH · Direct Planning",
  description: "Circuitos de espacios publicitarios para cobertura geográfica ampliada.",
};

export default async function CircuitosCatalogoPage() {
  const circuits = await prisma.circuit.findMany({
    where: { isPublished: true },
    include: {
      provider: { select: { companyName: true } },
      units: {
        include: {
          unit: { select: { name: true, locationLabel: true, format: true, latitude: true, longitude: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="h-full w-full overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10 space-y-10">
      <header>
        <Link href="/explorar" className="text-sm text-muted-foreground hover:text-led transition">← Catálogo</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-led">Circuitos OOH</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
          Circuitos de cobertura
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-2xl">
          Paquetes de múltiples espacios agrupados para máxima cobertura geográfica. Contratás todos de una sola vez.
        </p>
      </header>

      {circuits.length === 0 ? (
        <div className={cn(surfaceCard(), "py-16 text-center")}>
          <p className="text-muted-foreground">No hay circuitos disponibles en este momento.</p>
          <Link href="/explorar" className="mt-4 inline-flex text-sm text-led font-semibold underline">Ver catálogo individual →</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {circuits.map((c) => (
            <div key={c.id} className={cn(surfaceCard(), "p-6 space-y-4")}>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{c.name}</h2>
                  {c.totalPrice && (
                    <span className="shrink-0 rounded-full bg-led/10 border border-led/30 px-2.5 py-1 text-sm font-bold text-led">
                      {formatArs(c.totalPrice)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{c.provider.companyName}</p>
                {c.description && <p className="mt-3 text-sm leading-relaxed text-foreground/80">{c.description}</p>}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.units.length} espacio{c.units.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1.5">
                  {c.units.slice(0, 5).map((cu) => (
                    <div key={cu.id} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-led shrink-0" />
                      <span className="text-foreground font-medium">{cu.unit.name}</span>
                      <span className="text-muted-foreground truncate">· {cu.unit.locationLabel}</span>
                    </div>
                  ))}
                  {c.units.length > 5 && (
                    <p className="text-xs text-muted-foreground pl-3.5">+{c.units.length - 5} espacios más</p>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Para contratar este circuito, contactá al medio{" "}
                  <span className="font-medium text-foreground">{c.provider.companyName}</span>
                  {" "}o solicitá cada espacio individualmente desde el catálogo.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
