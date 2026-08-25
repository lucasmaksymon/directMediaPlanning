import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listInternalProviders } from "@/lib/ops-access";
import { adminOpsPage, adminOpsPageBody } from "@/lib/ui-classes";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { InventoryUnitForm } from "./InventoryUnitForm";

export default async function NewInventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className={adminOpsPage}>
      <div className="space-y-3">
        <Breadcrumb
          items={[
            { label: "Inventario", href: "/admin/operaciones/inventory" },
            { label: "Nueva unidad" },
          ]}
        />
        <PageHeader
          description="Describí el espacio (pantalla, valla, paquete), la zona y un precio de referencia. Podés dejarla en borrador y publicarla cuando esté validada."
          title="Nueva unidad"
        />
      </div>
      <div className={adminOpsPageBody}>
        <InventoryUnitForm providers={await listInternalProviders()} />
      </div>
    </div>
  );
}
