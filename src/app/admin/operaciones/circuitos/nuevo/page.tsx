import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { CircuitForm } from "../CircuitForm";
import { adminOpsPage, adminOpsPageBody, adminOpsPageHeader } from "@/lib/ui-classes";

export const metadata = { title: productTitle("Nuevo circuito") };

export default async function NuevoCircuitoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rawUnits = await prisma.inventoryUnit.findMany({
    select: { id: true, name: true, locationLabel: true, format: true, basePriceAmount: true },
    orderBy: { name: "asc" },
  });
  const units = rawUnits.map((u) => ({ ...u, basePriceAmount: u.basePriceAmount.toString() }));

  return (
    <div className={adminOpsPage}>
      <header className={adminOpsPageHeader}>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-led"
          href="/admin/operaciones/circuitos"
        >
          <span aria-hidden>←</span> Circuitos OOH
        </Link>
        <h1 className="font-display mt-3 text-2xl font-normal uppercase tracking-wide text-foreground sm:text-3xl">
          Nuevo circuito
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Agrupá unidades de tu inventario para ofrecerlas como un paquete comercial.
        </p>
      </header>
      <div className={adminOpsPageBody}>
        <CircuitForm units={units} />
      </div>
    </div>
  );
}
