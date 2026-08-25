import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { PayReservationButton } from "@/components/payments/PayReservationButton";
import { Breadcrumb, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { PublicationOrderForm } from "./PublicationOrderForm";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "advertiser") redirect("/login");

  const campaign = await prisma.campaign.findFirst({
    where: { id, advertiserId: session.user.id },
    include: {
      reservations: {
        include: {
          inventoryUnit: { select: { name: true, locationLabel: true } },
          payment: true,
          proofOfPlay: true,
          publicationOrder: true,
        },
        orderBy: { startsAt: "asc" },
      },
      creatives: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!campaign) notFound();

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <div className="space-y-3">
        <Breadcrumb
          items={[
            { label: "Campañas", href: "/advertiser/campanas" },
            { label: campaign.name },
          ]}
        />
        <PageHeader
          description={`Estado: ${campaign.status}`}
          title={campaign.name}
        />
      </div>

      <section className={cn(surfaceCard(), "space-y-3 p-5")}>
        <SectionHeader title="Reservas" />
        {campaign.reservations.length === 0 ? (
          <EmptyState
            description="Todavía no hay reservas asociadas a esta campaña."
            title="Sin reservas"
          />
        ) : (
          campaign.reservations.map((r) => (
            <div key={r.id} className="border-b border-border pb-3 last:border-0">
              <p className="font-medium">{r.inventoryUnit.name}</p>
              <p className="text-sm text-muted-foreground">
                {r.inventoryUnit.locationLabel} · {r.status} · {formatArs(r.agreedAmount ?? 0)}
              </p>
              {r.status === "accepted" && !r.payment && <PayReservationButton reservationId={r.id} />}
              {r.proofOfPlay && <p className="mt-1 text-xs text-led">PoP: {r.proofOfPlay.status}</p>}
              {r.publicationOrder && (
                <p className="text-xs text-muted-foreground">
                  Orden publicación: {r.publicationOrder.status}
                </p>
              )}
              {["accepted", "confirmed", "payment_pending"].includes(r.status) &&
                campaign.creatives.length > 0 && (
                  <PublicationOrderForm
                    creativeIds={campaign.creatives.map((c) => c.id)}
                    reservationId={r.id}
                  />
                )}
            </div>
          ))
        )}
      </section>

      <section className={cn(surfaceCard(), "p-5")}>
        <SectionHeader
          actions={
            <Link className="text-sm text-led underline" href="/advertiser/creativos">
              Gestionar biblioteca →
            </Link>
          }
          className="mb-3"
          title="Creativos"
        />
        {campaign.creatives.length === 0 ? (
          <EmptyState
            actionHref="/advertiser/creativos"
            actionLabel="Ir a biblioteca"
            description="Asociá creativos desde la biblioteca."
            title="Sin creativos"
          />
        ) : (
          <ul className="mt-3 space-y-2">
            {campaign.creatives.map((cr) => (
              <li key={cr.id} className="text-sm">
                {cr.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
