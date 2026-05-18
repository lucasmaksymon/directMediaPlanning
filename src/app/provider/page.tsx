import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProviderHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "provider" && session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <header>
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Panel del medio
        </h1>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/provider/inventory", label: "Inventario", desc: "Gestioná espacios y visibilidad" },
          { href: "/provider/reservations", label: "Solicitudes", desc: "Pedidos entrantes pendientes" },
          { href: "/provider/inventory/new", label: "Nueva unidad", desc: "Sumá un espacio al catálogo" },
          { href: "/provider/analytics", label: "Analíticas", desc: "Fill rate e ingresos" },
          { href: "/provider/circuitos", label: "Circuitos OOH", desc: "Paquetes de múltiples espacios" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-led/40"
          >
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            <span className="mt-3 text-xs font-bold text-led">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
