import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cn } from "@/lib/cn";
import { adminPage, surfaceCard } from "@/lib/ui-classes";
import { PageHeader } from "@/components/ui";

export default async function ProviderHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className={cn(adminPage, "gap-3")}>
      <PageHeader title="Operaciones" />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/admin/operaciones/inventory", label: "Inventario", desc: "Gestioná espacios y visibilidad" },
          { href: "/admin/operaciones/reservations", label: "Solicitudes", desc: "Pedidos entrantes pendientes" },
          { href: "/admin/operaciones/inventory/new", label: "Nueva unidad", desc: "Sumá un espacio al catálogo" },
          { href: "/admin", label: "Métricas", desc: "Fill rate e ingresos" },
          { href: "/admin/operaciones/circuitos", label: "Circuitos OOH", desc: "Paquetes de múltiples espacios" },
          { href: "/admin/operaciones/programmatic", label: "SSP / Programática", desc: "Deals OpenRTB y floor price" },
        ].map((item) => (
          <Link
            key={item.href}
            className={cn(surfaceCard(), "flex flex-col p-4 transition hover:border-led/40")}
            href={item.href}
          >
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            <span className="mt-3 text-xs font-semibold text-led">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
