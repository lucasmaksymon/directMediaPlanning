import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

export default async function ProviderHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "provider" && session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-10">
      <header className="max-w-5xl">
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">
          Panel del medio
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Inventario, precios de referencia y solicitudes de anunciantes en un solo lugar. Pensado
          para equipos que escalan catálogo y operación comercial.
        </p>
      </header>

      <ul className="flex flex-wrap gap-3">
        <li>
          <Link className={btnPrimary} href="/provider/inventory/new">
            Nueva unidad
          </Link>
        </li>
        <li>
          <Link className={btnSecondary} href="/provider/inventory">
            Inventario
          </Link>
        </li>
        <li>
          <Link className={btnSecondary} href="/provider/reservations">
            Solicitudes
          </Link>
        </li>
      </ul>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-3xl border border-border bg-card p-6 shadow-sm transition nm-glow hover:border-led/35 dark:bg-gradient-to-b dark:from-ocean dark:to-[#071012]"
          href="/provider/inventory"
        >
          <h2 className="text-sm font-semibold text-foreground">Catálogo propio</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Gestioná espacios, estados y visibilidad pública.
          </p>
        </Link>
        <Link
          className="rounded-3xl border border-border bg-card p-6 shadow-sm transition nm-glow hover:border-led/35 dark:bg-gradient-to-b dark:from-ocean dark:to-[#071012]"
          href="/provider/reservations"
        >
          <h2 className="text-sm font-semibold text-foreground">Solicitudes</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Pedidos entrantes y respuestas pendientes.
          </p>
        </Link>
      </section>
    </div>
  );
}
