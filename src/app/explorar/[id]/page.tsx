import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReserveForm } from "./ReserveForm";
import { surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { getUnitCalendar } from "@/app/actions/availability";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { ImageGallery } from "@/components/explore/ImageGallery";
import { AudienceInsight } from "@/components/explore/AudienceInsight";

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital · vía pública",
  static_ooh: "OOH estático",
  digital_package: "Paquete digital",
};

export default async function ExplorarDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id, status: "published" },
    include: { provider: { select: { companyName: true } } },
  });
  if (!unit) notFound();

  const isAdvertiser = session?.user?.role === "advertiser";
  const calendarBlocks = await getUnitCalendar(id);

  return (
    <main className="h-full w-full overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <Link
        className="text-sm font-medium text-muted-foreground transition hover:text-led hover:underline"
        href="/explorar"
      >
        ← Catálogo
      </Link>
      <article className="mt-6 space-y-4">
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
          {unit.name}
        </h1>
        <p className="leading-relaxed text-muted-foreground">{unit.locationLabel}</p>

        {/* Galería de fotos */}
        {unit.imageUrls && unit.imageUrls.length > 0 && (
          <ImageGallery images={unit.imageUrls} unitName={unit.name} />
        )}

        {unit.description && (
          <p className="mt-4 text-base leading-relaxed text-foreground/90">{unit.description}</p>
        )}
        {/* Badges destacados */}
        <div className="flex flex-wrap gap-2">
          {(unit as { instantBookEnabled?: boolean }).instantBookEnabled && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-led/40 bg-led/10 px-3 py-1 text-xs font-semibold text-led">
              Confirmación inmediata
            </span>
          )}
          {(unit as { lastMinuteEnabled?: boolean; lastMinuteDiscountPercent?: number }).lastMinuteEnabled && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/40 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
              Last Minute — {(unit as { lastMinuteDiscountPercent?: number }).lastMinuteDiscountPercent ?? 20}% OFF
            </span>
          )}
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Precio de referencia</dt>
            <dd className="mt-1 font-medium text-foreground">{formatArs(unit.basePriceAmount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Formato</dt>
            <dd className="mt-1 font-medium text-foreground">{formatLabels[unit.format] ?? unit.format}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Medio</dt>
            <dd className="mt-1 font-medium text-foreground">{unit.provider.companyName}</dd>
          </div>
        </dl>
      </article>

      {/* Estimación de audiencia */}
      {unit.latitude && unit.longitude && (
        <div className="mt-8">
          <AudienceInsight unitId={unit.id} />
        </div>
      )}

      {/* Calendario de disponibilidad */}
      <section className={cn(surfaceCard(), "mt-10 p-6 sm:p-8")}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Disponibilidad</h2>
        <AvailabilityCalendar blocks={calendarBlocks} readonly />
      </section>

      <section className={cn(surfaceCard(), "mt-6 p-6 sm:p-8")}>
        <h2 className="text-lg font-semibold text-foreground">Solicitar disponibilidad</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Indicá el rango de fechas. El medio revisará el pedido y se pondrá en contacto para confirmar
          condiciones.
        </p>
        <div className="mt-6">
          <ReserveForm isAdvertiser={isAdvertiser} unitId={unit.id} />
        </div>
      </section>
    </main>
  );
}
