import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReserveForm } from "./ReserveForm";
import { layoutPadding, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { getUnitCalendar } from "@/app/actions/availability";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { ImageGallery } from "@/components/explore/ImageGallery";
import { AudienceInsight } from "@/components/explore/AudienceInsight";
import { CLIENT_BRAND } from "@/lib/brand";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb, SectionHeader } from "@/components/ui/Patterns";

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

  const role = session?.user?.role;
  const isAdvertiser = role === "advertiser";

  let agencyProfile: { id: string; companyName: string; commissionPct: unknown } | null = null;
  if (isAdvertiser && session?.user?.id) {
    const agencyLink = await prisma.agencyClient.findFirst({
      where: { advertiserId: session.user.id },
      include: {
        agency: { select: { id: true, companyName: true, commissionPct: true } },
      },
    });
    agencyProfile = agencyLink?.agency ?? null;
  }

  const hasAgencyPrice = unit.agencyPriceAmount !== null;
  const isViaAgency = isAdvertiser && agencyProfile !== null && hasAgencyPrice;
  const displayPrice = isViaAgency ? unit.agencyPriceAmount! : unit.basePriceAmount;
  const directPrice = unit.basePriceAmount;
  const hasImages = Boolean(unit.imageUrls?.length);

  const calendarBlocks = await getUnitCalendar(id);

  return (
    <main className={cn(pageScroll, layoutPadding, "py-5 pb-10 sm:py-6")}>
      <Breadcrumb
        items={[
          { label: "Catálogo", href: "/explorar" },
          { label: unit.name },
        ]}
      />

      {/* Hero: foto + datos clave en paralelo */}
      <div
        className={cn(
          "mt-4 grid gap-6",
          hasImages ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-8" : "",
        )}
      >
        {hasImages ? (
          <ImageGallery images={unit.imageUrls} unitName={unit.name} className="lg:sticky lg:top-4" />
        ) : null}

        <div className="min-w-0 space-y-4">
          <header className="space-y-1.5">
            <h1 className="nm-page-title">{unit.name}</h1>
            <p className="nm-secondary">{unit.locationLabel}</p>
          </header>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="default">{formatLabels[unit.format] ?? unit.format}</Badge>
            {unit.instantBookEnabled && <Badge variant="brand">Confirmación inmediata</Badge>}
            {unit.lastMinuteEnabled && (
              <Badge variant="warning">
                Last Minute — {unit.lastMinuteDiscountPercent ?? 20}% OFF
              </Badge>
            )}
            {isViaAgency && (
              <Badge variant="brand">Precio vía {agencyProfile!.companyName}</Badge>
            )}
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3">
            <p className="nm-caption">
              {isViaAgency ? "Tu precio (vía agencia)" : "Precio de referencia"}
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-led">
              {formatArs(displayPrice)}
            </p>
            {isViaAgency && (
              <p className="nm-caption mt-1">
                Precio directo: <span className="line-through">{formatArs(directPrice)}</span>
              </p>
            )}
            {!isViaAgency && hasAgencyPrice && isAdvertiser && (
              <p className="mt-1 text-xs text-led">
                Con agencia: desde {formatArs(unit.agencyPriceAmount!)}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="nm-caption">Proveedor</dt>
              <dd className="mt-0.5 font-medium text-foreground">{unit.provider.companyName}</dd>
            </div>
            <div>
              <dt className="nm-caption">Operador</dt>
              <dd className="mt-0.5 font-medium text-foreground">{CLIENT_BRAND}</dd>
            </div>
          </dl>

          {unit.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{unit.description}</p>
          ) : null}

          {unit.latitude && unit.longitude ? (
            <AudienceInsight unitId={unit.id} />
          ) : null}
        </div>
      </div>

      {/* Acción: calendario + solicitud juntos */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:items-start">
        <section className={cn(surfaceCard(), "p-5")}>
          <SectionHeader title="Disponibilidad" />
          <div className="mt-3">
            <AvailabilityCalendar blocks={calendarBlocks} readonly />
          </div>
        </section>

        <section className={cn(surfaceCard(), "p-5")}>
          <SectionHeader
            description="Indicá fechas; el medio revisa y confirma condiciones."
            title="Solicitar"
          />
          {isViaAgency && agencyProfile ? (
            <div className="mt-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary-subtle px-3 py-2.5 text-sm">
              Solicitud vía <strong>{agencyProfile.companyName}</strong> a{" "}
              <strong className="text-led">{formatArs(displayPrice)}</strong>.
            </div>
          ) : null}
          <div className="mt-4">
            <ReserveForm
              agencyId={agencyProfile?.id ?? null}
              isAdvertiser={isAdvertiser}
              isViaAgency={isViaAgency}
              unitId={unit.id}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
