import { getLastMinuteUnits } from "@/lib/last-minute";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { layoutPadding, pageScroll, surfaceCard } from "@/lib/ui-classes";
import Image from "next/image";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = {
  title: productTitle("Last Minute"),
  description: "Espacios disponibles con descuento inmediato. Oportunidades para campañas rápidas.",
};

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital OOH",
  static_ooh: "OOH estático",
  digital_package: "Paquete digital",
};

export default async function LastMinutePage() {
  const units = await getLastMinuteUnits();

  return (
    <main className={cn(pageScroll, layoutPadding, "space-y-8 py-8")}>
      <PageHeader
        description="Espacios sin reserva en los próximos días con descuento automático. Ideal para campañas de lanzamiento rápido o relleno de inventario."
        eyebrow="Oportunidad"
        title="Last Minute"
      />

      {units.length === 0 ? (
        <EmptyState
          actionHref="/explorar"
          actionLabel="Ver catálogo completo"
          description="No hay espacios last-minute disponibles en este momento."
          title="Sin oportunidades"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <Link
              key={u.id}
              className={cn(surfaceCard(), "flex flex-col overflow-hidden transition hover:border-signal/40")}
              href={`/explorar/${u.id}`}
            >
              <div className="relative h-40 w-full bg-muted">
                {u.imageUrl ? (
                  <Image alt={u.name} className="object-cover" fill src={u.imageUrl} unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted" />
                )}
                <div className="absolute top-2 right-2">
                  <span className="rounded-[var(--radius-md)] bg-signal px-2 py-1 text-xs font-bold text-white">
                    -{u.discountPercent}%
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="line-clamp-2 font-semibold text-foreground">{u.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{u.locationLabel}</p>
                <p className="text-xs text-muted-foreground">{formatLabels[u.format] ?? u.format}</p>

                <div className="mt-4">
                  <p className="text-xs text-muted-foreground line-through">{formatArs(u.originalPrice)}</p>
                  <p className="text-xl font-bold text-signal">{formatArs(u.discountedPrice)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Disponible los próximos {u.windowDays} días
                  </p>
                </div>

                <div className="mt-4">
                  <span className="inline-flex items-center rounded-[var(--radius-md)] border border-signal/30 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
                    Ver espacio →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          Los precios con descuento son orientativos. El medio confirma las condiciones finales.
        </p>
        <Link className="text-sm font-medium text-led hover:underline" href="/explorar">
          Ver catálogo completo →
        </Link>
      </div>
    </main>
  );
}
