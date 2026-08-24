import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { PayReservationButton } from "@/components/payments/PayReservationButton";
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
      <div>
        <Link href="/advertiser/campanas" className="text-sm text-muted-foreground hover:text-led">← Campañas</Link>
        <h1 className="font-display mt-2 text-2xl uppercase tracking-wide">{campaign.name}</h1>
        <p className="text-sm text-muted-foreground">Estado: {campaign.status}</p>
      </div>

      <section className={cn(surfaceCard(), "p-5 space-y-3")}>
        <h2 className="font-semibold">Reservas</h2>
        {campaign.reservations.map((r) => (
          <div key={r.id} className="border-b border-border pb-3 last:border-0">
            <p className="font-medium">{r.inventoryUnit.name}</p>
            <p className="text-sm text-muted-foreground">
              {r.inventoryUnit.locationLabel} · {r.status} · {formatArs(r.agreedAmount ?? 0)}
            </p>
            {r.status === "accepted" && !r.payment && <PayReservationButton reservationId={r.id} />}
            {r.proofOfPlay && <p className="text-xs text-led mt-1">PoP: {r.proofOfPlay.status}</p>}
            {r.publicationOrder && <p className="text-xs text-muted-foreground">Orden publicación: {r.publicationOrder.status}</p>}
            {["accepted", "confirmed", "payment_pending"].includes(r.status) && campaign.creatives.length > 0 && (
              <PublicationOrderForm reservationId={r.id} creativeIds={campaign.creatives.map((c) => c.id)} />
            )}
          </div>
        ))}
      </section>

      <section className={cn(surfaceCard(), "p-5")}>
        <h2 className="font-semibold mb-3">Creativos</h2>
        <Link href="/advertiser/creativos" className="text-sm text-led underline">Gestionar biblioteca →</Link>
        <ul className="mt-3 space-y-2">
          {campaign.creatives.map((cr) => (
            <li key={cr.id} className="text-sm">{cr.name}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
