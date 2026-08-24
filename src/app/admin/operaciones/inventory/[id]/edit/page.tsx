import Link from "next/link";
import { auth } from "@/auth";
import { listInternalProviders } from "@/lib/ops-access";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { adminOpsPage, adminOpsPageBody, adminOpsPageHeader } from "@/lib/ui-classes";
import { InventoryUnitForm } from "../../new/InventoryUnitForm";

export default async function EditInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const [unit, providers] = await Promise.all([
    prisma.inventoryUnit.findFirst({ where: { id } }),
    listInternalProviders(),
  ]);
  if (!unit) notFound();

  return (
    <div className={adminOpsPage}>
      <header className={adminOpsPageHeader}>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-led"
          href="/admin/operaciones/inventory"
        >
          <span aria-hidden>←</span> Inventario
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Edición
        </p>
        <h1 className="font-display mt-1 text-2xl font-normal uppercase tracking-wide text-foreground sm:text-3xl">
          Editar unidad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{unit.name}</p>
      </header>
      <div className={adminOpsPageBody}>
        <InventoryUnitForm
          providers={providers}
          unit={{
            id: unit.id,
            providerId: unit.providerId,
            name: unit.name,
            locationLabel: unit.locationLabel,
            basePriceAmount: unit.basePriceAmount.toString(),
            format: unit.format,
            priceModel: unit.priceModel,
            status: unit.status,
            minimalBookingGranularity: unit.minimalBookingGranularity,
            latitude: unit.latitude != null ? String(unit.latitude) : null,
            longitude: unit.longitude != null ? String(unit.longitude) : null,
            description: unit.description,
            imageUrls: unit.imageUrls,
            instantBookEnabled: unit.instantBookEnabled,
            instantBookMinDays: unit.instantBookMinDays,
            lastMinuteEnabled: unit.lastMinuteEnabled,
            lastMinuteDiscountPercent: unit.lastMinuteDiscountPercent,
          }}
        />
      </div>
    </div>
  );
}
