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
import { Breadcrumb, PageHeader, SectionHeader } from "@/components/ui/Patterns";

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

  const calendarBlocks = await getUnitCalendar(id);

  return (
    <main className={cn(pageScroll, layoutPadding, "py-8 pb-12")}>
      <Breadcrumb
        items={[
          { label: "Catálogo", href: "/explorar" },
          { label: unit.name },
        ]}
      />

      <article className="mt-6 space-y-4">
        <PageHeader
          description={unit.locationLabel}
          title={unit.name}
        />

        {unit.imageUrls && unit.imageUrls.length > 0 && (
          <ImageGallery images={unit.imageUrls} unitName={unit.name} />
        )}

        {unit.description && (
          <p className="mt-4 text-base leading-relaxed text-foreground/90">{unit.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {unit.instantBookEnabled && (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-led/40 bg-led/10 px-3 py-1 text-xs font-semibold text-led">
              Confirmación inmediata
            </span>
          )}
          {unit.lastMinuteEnabled && (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-signal/40 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
              Last Minute — {unit.lastMinuteDiscountPercent ?? 20}% OFF
            </span>
          )}
          {isViaAgency && (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-led/60 bg-led/15 px-3 py-1 text-xs font-semibold text-led">
              Precio especial vía {agencyProfile!.companyName}
            </span>
          )}
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              {isViaAgency ? "Tu precio (vía agencia)" : "Precio de referencia"}
            </dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-led">
              {formatArs(displayPrice)}
            </dd>
            {isViaAgency && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Precio directo:{" "}
                <span className="line-through">{formatArs(directPrice)}</span>
              </p>
            )}
            {!isViaAgency && hasAgencyPrice && isAdvertiser && (
              <p className="mt-1 text-xs text-led">
                ¿Tenés agencia? Podés acceder a precio especial de{" "}
                {formatArs(unit.agencyPriceAmount!)}
              </p>
            )}
          </div>
          <div>
            <dt className="text-muted-foreground">Formato</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatLabels[unit.format] ?? unit.format}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Proveedor</dt>
            <dd className="mt-1 font-medium text-foreground">{unit.provider.companyName}</dd>
            <p className="mt-0.5 text-xs text-muted-foreground">Operado vía {CLIENT_BRAND}</p>
          </div>
        </dl>
      </article>

      {unit.latitude && unit.longitude && (
        <div className="mt-8">
          <AudienceInsight unitId={unit.id} />
        </div>
      )}

      <section className={cn(surfaceCard(), "mt-10 p-6 sm:p-8")}>
        <SectionHeader title="Disponibilidad" />
        <div className="mt-4">
          <AvailabilityCalendar blocks={calendarBlocks} readonly />
        </div>
      </section>

      <section className={cn(surfaceCard(), "mt-6 p-6 sm:p-8")}>
        <SectionHeader
          description="Indicá el rango de fechas. El medio revisará el pedido y se pondrá en contacto para confirmar condiciones."
          title="Solicitar disponibilidad"
        />
        {isViaAgency && agencyProfile && (
          <div className="mt-3 rounded-[var(--radius-lg)] border border-led/30 bg-led/5 px-4 py-3 text-sm">
            <p className="text-foreground">
              Esta solicitud se enviará{" "}
              <strong>a través de {agencyProfile.companyName}</strong> al precio de{" "}
              <strong className="text-led">{formatArs(displayPrice)}</strong>.
            </p>
          </div>
        )}
        <div className="mt-6">
          <ReserveForm
            agencyId={agencyProfile?.id ?? null}
            isAdvertiser={isAdvertiser}
            isViaAgency={isViaAgency}
            unitId={unit.id}
          />
        </div>
      </section>
    </main>
  );
}
