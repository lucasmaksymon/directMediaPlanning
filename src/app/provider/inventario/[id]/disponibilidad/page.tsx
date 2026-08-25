import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUnitCalendar } from "@/app/actions/availability";
import { DisponibilidadClient } from "@/app/admin/operaciones/inventory/[id]/disponibilidad/DisponibilidadClient";
import { panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import Link from "next/link";

export const metadata = { title: productTitle("Disponibilidad") };

export default async function ProviderDisponibilidadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) redirect("/provider");

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id, providerId: profile.id },
    select: { id: true, name: true },
  });
  if (!unit) notFound();

  const blocks = await getUnitCalendar(unit.id);

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <div>
        <Link href="/provider/inventario" className="text-sm text-muted-foreground hover:text-led">← Mis espacios</Link>
        <h1 className="nm-page-title mt-2">Disponibilidad — {unit.name}</h1>
      </div>
      <DisponibilidadClient unitId={unit.id} initialBlocks={blocks} />
    </div>
  );
}
