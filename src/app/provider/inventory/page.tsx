import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { inventoryStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { redirect } from "next/navigation";
import { btnPrimary } from "@/lib/ui-classes";

export default async function ProviderInventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "provider" && session.user.role !== "admin") {
    redirect("/");
  }

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) {
    return (
      <p className="text-muted-foreground">
        No encontramos el perfil de tu medio. Si el problema continúa, contactá soporte.
      </p>
    );
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { providerId: profile.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-4xl">
          <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">
            Inventario
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Solo las unidades «Publicado» aparecen en el catálogo público. Los borradores quedan
            ocultos hasta que las actives.
          </p>
        </div>
        <Link className={btnPrimary} href="/provider/inventory/new">
          Nueva unidad
        </Link>
      </div>

      {units.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center text-muted-foreground backdrop-blur-sm">
          Aún no cargaste espacios.{" "}
          <Link className="font-semibold text-foreground underline" href="/provider/inventory/new">
            Crear la primera unidad
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-sm nm-glow dark:bg-gradient-to-b dark:from-ocean dark:to-[#071012]">
          {units.map((u) => (
            <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6" key={u.id}>
              <div>
                <p className="font-medium text-foreground">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.locationLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatArs(u.basePriceAmount)} · {inventoryStatusLabel[u.status] ?? u.status}
                </p>
              </div>
              <Link
                className="text-sm font-semibold text-foreground underline underline-offset-2"
                href={`/provider/inventory/${u.id}/edit`}
              >
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
