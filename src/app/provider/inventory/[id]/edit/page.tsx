import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { redirect, notFound } from "next/navigation";
import { InventoryUnitForm } from "../../new/InventoryUnitForm";

export default async function EditInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "provider" && session.user.role !== "admin") {
    redirect("/");
  }

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) notFound();

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id, providerId: profile.id },
  });
  if (!unit) notFound();

  return (
    <div className="space-y-10">
      <header className="max-w-4xl">
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-led"
          href="/provider/inventory"
        >
          <span aria-hidden>←</span> Inventario
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Edición
        </p>
        <h1 className="font-display mt-1 text-3xl font-normal uppercase tracking-wide text-foreground">
          Editar unidad
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{unit.name}</p>
      </header>
      <InventoryUnitForm
        unit={{
          id: unit.id,
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
        }}
      />
    </div>
  );
}
