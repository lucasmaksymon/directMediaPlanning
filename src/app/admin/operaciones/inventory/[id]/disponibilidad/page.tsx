import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUnitCalendar } from "@/app/actions/availability";
import { DisponibilidadClient } from "./DisponibilidadClient";
import Link from "next/link";
import { adminOpsPage, adminOpsPageBody, adminOpsPageHeader } from "@/lib/ui-classes";

type Props = { params: Promise<{ id: string }> };

export default async function DisponibilidadPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id },
    select: { id: true, name: true },
  });
  if (!unit) redirect("/admin/operaciones/inventory");

  const blocks = await getUnitCalendar(id);

  return (
    <div className={adminOpsPage}>
      <header className={adminOpsPageHeader}>
        <Link
          href="/admin/operaciones/inventory"
          className="text-sm font-medium text-muted-foreground transition hover:text-led"
        >
          ← Inventario
        </Link>
        <h1 className="nm-page-title mt-3">
          Disponibilidad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{unit.name}</p>
      </header>
      <div className={adminOpsPageBody}>
        <DisponibilidadClient initialBlocks={blocks} unitId={id} />
      </div>
    </div>
  );
}
