import Link from "next/link";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { CircuitForm } from "../../CircuitForm";
import { adminOpsPage, adminOpsPageBody, adminOpsPageHeader } from "@/lib/ui-classes";

export const metadata = { title: productTitle("Editar circuito") };

export default async function EditarCircuitoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const { id } = await params;

  const [circuit, rawUnits] = await Promise.all([
    prisma.circuit.findUnique({
      where: { id },
      include: {
        units: { orderBy: { order: "asc" }, select: { unitId: true } },
      },
    }),
    prisma.inventoryUnit.findMany({
      select: { id: true, name: true, locationLabel: true, format: true, basePriceAmount: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!circuit) notFound();

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
          Editar circuito
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Modificá el nombre, la descripción y los espacios incluidos en el paquete.
        </p>
      </header>
      <div className={adminOpsPageBody}>
        <CircuitForm
          units={units}
          circuit={{
            id: circuit.id,
            name: circuit.name,
            description: circuit.description,
            isPublished: circuit.isPublished,
            unitIds: circuit.units.map((u) => u.unitId),
          }}
        />
      </div>
    </div>
  );
}
