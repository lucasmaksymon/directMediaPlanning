import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import { PoPSubmitForm } from "./PoPSubmitForm";

export const metadata = { title: productTitle("Post-campaña") };

export default async function PostCampanaPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "advertiser") redirect("/login");

  const reservations = await prisma.reservation.findMany({
    where: {
      advertiserId: session.user.id,
      status: { in: ["confirmed", "accepted", "payment_pending"] },
    },
    include: {
      inventoryUnit: { select: { name: true } },
      proofOfPlay: true,
      payment: true,
    },
    orderBy: { endsAt: "desc" },
    take: 30,
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Reporting</p>
        <h1 className="font-display mt-1 text-2xl uppercase tracking-wide">Post-campaña</h1>
        <p className="text-sm text-muted-foreground mt-2">Estado de pagos, proof-of-play y entregas.</p>
      </div>

      <div className="space-y-4">
        {reservations.map((r) => (
          <div key={r.id} className={cn(surfaceCard(), "p-5")}>
            <p className="font-semibold">{r.inventoryUnit.name}</p>
            <p className="text-sm text-muted-foreground">
              {r.startsAt.toLocaleDateString("es-AR")} — {r.endsAt.toLocaleDateString("es-AR")} · {r.status}
            </p>
            <p className="text-sm mt-1">Monto: {formatArs(r.agreedAmount ?? 0)}</p>
            {r.platformFeeAmount != null && (
              <p className="text-xs text-muted-foreground">Comisión plataforma: {formatArs(r.platformFeeAmount)}</p>
            )}
            <p className="text-xs mt-2">
              Pago: {r.payment?.status ?? "pendiente"} · PoP: {r.proofOfPlay?.status ?? "pendiente"}
            </p>
            <PoPSubmitForm reservationId={r.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
