import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listInternalProviders } from "@/lib/ops-access";
import { adminOpsPage, adminOpsPageBody, adminOpsPageHeader } from "@/lib/ui-classes";
import { InventoryUnitForm } from "./InventoryUnitForm";

export default async function NewInventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className={adminOpsPage}>
      <header className={adminOpsPageHeader}>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-led"
          href="/admin/operaciones/inventory"
        >
          <span aria-hidden>←</span> Inventario
        </Link>
        <h1 className="font-display mt-3 text-2xl font-normal uppercase tracking-wide text-foreground sm:text-3xl">
          Nueva unidad
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Describí el espacio (pantalla, valla, paquete), la zona y un precio de referencia. Podés
          dejarla en borrador y publicarla cuando esté validada.
        </p>
      </header>
      <div className={adminOpsPageBody}>
        <InventoryUnitForm providers={await listInternalProviders()} />
      </div>
    </div>
  );
}
