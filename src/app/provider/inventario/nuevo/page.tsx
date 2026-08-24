import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import { NewInventoryForm } from "./NewInventoryForm";

export const metadata = { title: productTitle("Nuevo espacio") };

export default async function NuevoEspacioPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "provider" && session.user.role !== "admin")) {
    redirect("/");
  }

  return (
    <div className={cn(panelPage, pageScroll, "gap-6 max-w-2xl")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Inventario</p>
        <h1 className="font-display mt-1 text-2xl font-normal uppercase tracking-wide text-foreground">
          Nuevo espacio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cargá los datos de tu cartel, pantalla o espacio publicitario. Podés publicarlo de
          inmediato o guardarlo como borrador.
        </p>
      </div>
      <NewInventoryForm />
    </div>
  );
}
