import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { adminPage, adminPageBody, adminPageHeader, surfaceCard, tableScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { CreateProviderForm } from "./CreateProviderForm";

export const metadata = { title: productTitle("Proveedores") };

export default async function AdminProveedoresPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const providers = await prisma.providerProfile.findMany({
    orderBy: { companyName: "asc" },
    include: { _count: { select: { inventoryUnits: true } } },
  });

  return (
    <div className={cn(adminPage, "gap-4")}>
      <header className={adminPageHeader}>
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Proveedores internos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Socios o redes de carteles. No tienen acceso a la plataforma; solo se usan en operaciones.
          El parque (carteles) se carga en Inventario — el seed solo dio de alta los medios.
        </p>
      </header>

      <div className={cn(adminPageBody, "flex flex-col gap-6 pb-8")}>
        <CreateProviderForm />

        <div className={cn(surfaceCard(), tableScroll)}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Carteles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {providers.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-medium">{p.companyName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{p._count.inventoryUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
