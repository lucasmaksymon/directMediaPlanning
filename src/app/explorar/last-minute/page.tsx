import { getLastMinuteUnits } from "@/lib/last-minute";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { btnPrimary, surfaceCard } from "@/lib/ui-classes";
import Image from "next/image";

export const metadata = {
  title: "Last Minute · Direct Planning",
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
    <main className="h-full w-full overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10 space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">Oportunidad</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
          Last Minute
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-2xl">
          Espacios sin reserva en los próximos días con descuento automático. Ideal para campañas de lanzamiento rápido o relleno de inventario.
        </p>
      </header>

      {units.length === 0 ? (
        <div className={cn(surfaceCard(), "py-16 text-center")}>
          <p className="text-muted-foreground">No hay espacios last-minute disponibles en este momento.</p>
          <Link href="/explorar" className="mt-4 inline-flex text-sm font-semibold text-led underline">
            Ver catálogo completo →
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <Link key={u.id} href={`/explorar/${u.id}`} className={cn(surfaceCard(), "flex flex-col overflow-hidden hover:border-signal/40 transition")}>
              {/* Imagen */}
              <div className="relative h-40 w-full bg-muted">
                {u.imageUrl ? (
                  <Image src={u.imageUrl} alt={u.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-3xl text-muted-foreground/30">📺</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="rounded-full bg-signal px-2 py-1 text-xs font-bold text-white shadow-lg">
                    -{u.discountPercent}%
                  </span>
                </div>
              </div>

              <div className="flex flex-col flex-1 p-5">
                <p className="font-semibold text-foreground line-clamp-2">{u.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{u.locationLabel}</p>
                <p className="text-xs text-muted-foreground">{u.providerName} · {formatLabels[u.format] ?? u.format}</p>

                <div className="mt-4">
                  <p className="text-xs text-muted-foreground line-through">{formatArs(u.originalPrice)}</p>
                  <p className="text-xl font-bold text-signal">{formatArs(u.discountedPrice)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Disponible los próximos {u.windowDays} días</p>
                </div>

                <div className="mt-4">
                  <span className="inline-flex items-center rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
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
        <Link href="/explorar" className="text-sm text-led font-medium hover:underline">
          Ver catálogo completo →
        </Link>
      </div>
    </main>
  );
}
