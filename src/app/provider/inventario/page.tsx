import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { ProviderInventoryActions } from "./ProviderInventoryActions";

export const metadata = { title: productTitle("Mis espacios") };

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital OOH",
  static_ooh: "OOH Estático",
  digital_package: "Paquete Digital",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-led/15 text-led" },
  draft: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  paused: { label: "Pausado", className: "bg-signal/15 text-signal" },
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
        <div className={cn(surfaceCard(), "p-8 text-center")}>
          <p className="text-muted-foreground">Perfil de proveedor no encontrado.</p>
        </div>
      </div>
    );
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { providerId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Inventario</p>
          <h1 className="font-display mt-1 text-2xl font-normal uppercase tracking-wide text-foreground">
            Mis espacios
          </h1>
        </div>
        <Link
          href="/provider/inventario/nuevo"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition hover:scale-[1.03]"
        >
          + Agregar espacio
        </Link>
      </div>

      {units.length === 0 ? (
        <div className={cn(surfaceCard(), "p-10 text-center")}>
          <p className="text-muted-foreground">Aún no tenés espacios cargados.</p>
          <Link
            href="/provider/inventario/nuevo"
            className="mt-4 inline-block text-sm font-semibold text-led underline"
          >
            Cargar primer espacio →
          </Link>
        </div>
      ) : (
        <div className={cn(surfaceCard(), "overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
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
                {units.map((unit) => {
                  const st = statusLabels[unit.status] ?? { label: unit.status, className: "bg-muted" };
                  return (
                    <tr key={unit.id} className="hover:bg-muted/40 transition">
                      <td className="px-5 py-3 font-medium text-foreground">{unit.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatLabels[unit.format] ?? unit.format}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[180px] truncate">
                        {unit.locationLabel}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                        {formatArs(unit.basePriceAmount)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                        {unit.agencyPriceAmount ? formatArs(unit.agencyPriceAmount) : "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", st.className)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ProviderInventoryActions
                          unitId={unit.id}
                          currentStatus={unit.status as "draft" | "published" | "paused"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
