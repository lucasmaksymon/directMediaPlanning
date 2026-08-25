import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { btnPrimary, layoutPadding, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { Breadcrumb, EmptyState, PageHeader } from "@/components/ui";

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital · vía pública",
  static_ooh: "OOH estático",
  digital_package: "Paquete digital",
};

const priceModelLabels: Record<string, string> = {
  fixed_list: "Precio de lista",
  negotiable: "Negociable",
  package: "Paquete cerrado",
};

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "").split(",").filter(Boolean).slice(0, 4);

  const units =
    ids.length > 0
      ? await prisma.inventoryUnit.findMany({
          where: { id: { in: ids }, status: "published" },
          include: { provider: { select: { companyName: true } } },
        })
      : [];

  return (
    <main className={cn(pageScroll, layoutPadding, "space-y-6 py-8")}>
      <div className="space-y-3">
        <Breadcrumb items={[{ label: "Catálogo", href: "/explorar" }, { label: "Comparar" }]} />
        <PageHeader title="Comparador de espacios" />
      </div>

      {units.length === 0 ? (
        <EmptyState
          actionHref="/explorar"
          actionLabel="Seleccionar desde el catálogo"
          description="No hay espacios para comparar."
          title="Sin selección"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr>
                <th className="w-40 pb-4 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Característica
                </th>
                {units.map((u) => (
                  <th key={u.id} className="pb-4 pr-4 text-left">
                    <div className={cn(surfaceCard(), "p-4")}>
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="mt-1 text-xs font-medium text-led/90">{u.provider.companyName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{u.locationLabel}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                {
                  label: "Precio ref. (ARS)",
                  render: (u: (typeof units)[0]) => (
                    <span className="text-base font-bold text-led">{formatArs(u.basePriceAmount)}</span>
                  ),
                },
                {
                  label: "CPM estimado",
                  render: (u: (typeof units)[0]) => {
                    const price = Number(u.basePriceAmount);
                    const cpm = (price / 50).toFixed(0);
                    return <span className="text-muted-foreground">${cpm} / 1k</span>;
                  },
                },
                {
                  label: "Formato",
                  render: (u: (typeof units)[0]) => formatLabels[u.format] ?? u.format,
                },
                {
                  label: "Proveedor",
                  render: (u: (typeof units)[0]) => u.provider.companyName,
                },
                {
                  label: "Ubicación",
                  render: (u: (typeof units)[0]) => u.locationLabel,
                },
                {
                  label: "Cotización",
                  render: (u: (typeof units)[0]) => priceModelLabels[u.priceModel] ?? u.priceModel,
                },
                {
                  label: "Reserva mínima",
                  render: (u: (typeof units)[0]) =>
                    u.minimalBookingGranularity === "day" ? "Por día" : "Por semana",
                },
                {
                  label: "Confirmación",
                  render: (u: (typeof units)[0]) =>
                    (u as { instantBookEnabled?: boolean }).instantBookEnabled ? (
                      <span className="font-semibold text-led">Instantánea</span>
                    ) : (
                      <span className="text-muted-foreground">Requiere aprobación</span>
                    ),
                },
                {
                  label: "Acción",
                  render: (u: (typeof units)[0]) => (
                    <Link className={cn(btnPrimary, "px-4 py-2 text-xs")} href={`/explorar/${u.id}`}>
                      Ver espacio
                    </Link>
                  ),
                },
              ].map(({ label, render }) => (
                <tr key={label}>
                  <td className="py-4 pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </td>
                  {units.map((u) => (
                    <td key={u.id} className="py-4 pr-4 text-foreground">
                      {render(u)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
