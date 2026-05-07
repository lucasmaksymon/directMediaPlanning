import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InventoryUnitForm } from "./InventoryUnitForm";

export default async function NewInventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "provider" && session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-10">
      <header className="max-w-4xl">
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-led"
          href="/provider/inventory"
        >
          <span aria-hidden>←</span> Inventario
        </Link>
        <h1 className="font-display mt-5 text-3xl font-normal uppercase tracking-wide text-foreground">
          Nueva unidad
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Describí el espacio (pantalla, valla, paquete), la zona y un precio de referencia. Podés
          dejarla en borrador y publicarla cuando esté validada.
        </p>
      </header>
      <InventoryUnitForm />
    </div>
  );
}
