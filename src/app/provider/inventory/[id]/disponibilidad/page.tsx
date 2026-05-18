import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { getUnitCalendar } from "@/app/actions/availability";
import { DisponibilidadClient } from "./DisponibilidadClient";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function DisponibilidadPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) redirect("/provider");

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id, providerId: profile.id },
    select: { id: true, name: true },
  });
  if (!unit) redirect("/provider/inventory");

  const blocks = await getUnitCalendar(id);

  return (
    <div className="space-y-8">
      <header>
        <Link href={`/provider/inventory`} className="text-sm text-muted-foreground hover:text-led transition">← Inventario</Link>
        <h1 className="font-display mt-4 text-3xl font-normal uppercase tracking-wide text-foreground">
          Disponibilidad
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{unit.name}</p>
      </header>
      <DisponibilidadClient unitId={id} initialBlocks={blocks} />
    </div>
  );
}
