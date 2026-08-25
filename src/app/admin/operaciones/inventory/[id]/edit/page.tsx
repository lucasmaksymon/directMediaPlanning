import Link from "next/link";
import { auth } from "@/auth";
import { listInternalProviders } from "@/lib/ops-access";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { adminOpsPage, adminOpsPageBody } from "@/lib/ui-classes";
import { Breadcrumb, PageHeader } from "@/components/ui/Patterns";
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
      <PageHeader
        description={unit.name}
        eyebrow="Edición"
        title="Editar unidad"
        actions={
          <Link
            className="text-sm font-medium text-muted-foreground hover:text-led"
            href="/admin/operaciones/inventory"
          >
            ← Inventario
          </Link>
        }
      />
      <Breadcrumb
        items={[
          { label: "Inventario", href: "/admin/operaciones/inventory" },
          { label: unit.name },
        ]}
      />
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
