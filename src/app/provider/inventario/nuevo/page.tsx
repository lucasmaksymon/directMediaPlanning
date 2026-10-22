import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import { PageHeader } from "@/components/ui";
import { NewInventoryForm } from "./NewInventoryForm";

import { isAdminRole } from "@/lib/roles";
export const metadata = { title: productTitle("Nuevo espacio") };

export default async function NuevoEspacioPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "provider" && !isAdminRole(session.user.role))) {
    redirect("/");
  }

  return (
    <div className={cn(panelPage, pageScroll, "max-w-2xl gap-6")}>
      <PageHeader
        description="Cargá los datos de tu cartel, pantalla o espacio publicitario. Podés publicarlo de inmediato o guardarlo como borrador."
        eyebrow="Inventario"
        title="Nuevo espacio"
      />
      <NewInventoryForm />
    </div>
  );
}
