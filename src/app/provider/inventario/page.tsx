import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll, btnPrimary, tableScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { ProviderInventoryActions } from "./ProviderInventoryActions";
import { EmptyState, PageHeader } from "@/components/ui/Patterns";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: productTitle("Mis espacios") };

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital OOH",
  static_ooh: "OOH Estático",
  digital_package: "Paquete Digital",
};

const statusVariant: Record<string, "brand" | "default" | "warning"> = {
  published: "brand",
  draft: "default",
  paused: "warning",
};

const statusLabels: Record<string, string> = {
  published: "Publicado",
  draft: "Borrador",
  paused: "Pausado",
};

export default async function ProviderInventarioPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "provider" && session.user.role !== "admin")) {
    redirect("/");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return (
      <div className={cn(panelPage, pageScroll)}>
        <EmptyState
          description="Perfil de proveedor no encontrado."
          title="Sin perfil"
        />
      </div>
    );
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { providerId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader
        actions={
          <Link className={btnPrimary} href="/provider/inventario/nuevo">
            + Agregar espacio
          </Link>
        }
        eyebrow="Inventario"
        title="Mis espacios"
      />

      {units.length === 0 ? (
        <EmptyState
          actionHref="/provider/inventario/nuevo"
          actionLabel="Cargar primer espacio"
          description="Aún no tenés espacios cargados."
          title="Sin espacios"
        />
      ) : (
        <div className={cn(surfaceCard(), tableScroll)}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Formato</th>
                <th className="px-5 py-3 text-left">Ubicación</th>
                <th className="px-5 py-3 text-right">Precio directo</th>
                <th className="px-5 py-3 text-right">Precio agencia</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((unit) => (
                <tr key={unit.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3 font-medium text-foreground">{unit.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatLabels[unit.format] ?? unit.format}
                  </td>
                  <td className="max-w-[180px] truncate px-5 py-3 text-muted-foreground">
                    {unit.locationLabel}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                    {formatArs(unit.basePriceAmount)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {unit.agencyPriceAmount ? formatArs(unit.agencyPriceAmount) : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={statusVariant[unit.status] ?? "default"}>
                      {statusLabels[unit.status] ?? unit.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ProviderInventoryActions
                      unitId={unit.id}
                      currentStatus={unit.status as "draft" | "published" | "paused"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
