import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { btnPrimary, layoutPadding, pageScroll, surfaceCard } from "@/lib/ui-classes";

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

  const units = ids.length > 0
    ? await prisma.inventoryUnit.findMany({
        where: { id: { in: ids }, status: "published" },
      })
    : [];

  return (
    <main className={cn(pageScroll, layoutPadding, "py-8")}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/explorar" className="text-sm text-muted-foreground hover:text-led transition">← Catálogo</Link>
          <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground">
            Comparador de espacios
          </h1>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center">
          <p className="text-muted-foreground">No hay espacios para comparar.</p>
          <Link href="/explorar" className="mt-4 inline-flex text-sm font-semibold text-led underline underline-offset-2">
            Seleccionar desde el catálogo →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr>
                <th className="w-40 pb-4 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Característica</th>
                {units.map((u) => (
                  <th key={u.id} className="pb-4 pr-4 text-left">
                    <div className={cn(surfaceCard(), "p-4")}>
                      <p className="font-semibold text-foreground text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{u.locationLabel}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                {
                  label: "Precio ref. (ARS)",
                  render: (u: typeof units[0]) => (
                    <span className="font-bold text-led text-base">{formatArs(u.basePriceAmount)}</span>
                  ),
                },
                {
                  label: "CPM estimado",
                  render: (u: typeof units[0]) => {
                    // Estimación simple: precio / 1000 contactos estimados por zona
                    const price = Number(u.basePriceAmount);
                    const cpm = (price / 50).toFixed(0); // Estimación básica
                    return <span className="text-muted-foreground">${cpm} / 1k</span>;
                  },
                },
                {
                  label: "Formato",
                  render: (u: typeof units[0]) => formatLabels[u.format] ?? u.format,
                },
                {
                  label: "Ubicación",
                  render: (u: typeof units[0]) => u.locationLabel,
                },
                {
                  label: "Cotización",
                  render: (u: typeof units[0]) => priceModelLabels[u.priceModel] ?? u.priceModel,
                },
                {
                  label: "Reserva mínima",
                  render: (u: typeof units[0]) => u.minimalBookingGranularity === "day" ? "Por día" : "Por semana",
                },
                {
                  label: "Confirmación",
                  render: (u: typeof units[0]) => (u as { instantBookEnabled?: boolean }).instantBookEnabled
                    ? <span className="text-led font-semibold">Instantánea</span>
                    : <span className="text-muted-foreground">Requiere aprobación</span>,
                },
                {
                  label: "Acción",
                  render: (u: typeof units[0]) => (
                    <Link href={`/explorar/${u.id}`} className={cn(btnPrimary, "text-xs px-4 py-2")}>
                      Ver espacio
                    </Link>
                  ),
                },
              ].map(({ label, render }) => (
                <tr key={label}>
                  <td className="py-4 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
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
