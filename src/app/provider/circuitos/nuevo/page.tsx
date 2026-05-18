import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { CircuitForm } from "./CircuitForm";

export const metadata = { title: "Nuevo Circuito · Direct Planning" };

export default async function NuevoCircuitoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) redirect("/provider");

  const rawUnits = await prisma.inventoryUnit.findMany({
    where: { providerId: profile.id },
    select: { id: true, name: true, locationLabel: true, format: true, basePriceAmount: true },
    orderBy: { name: "asc" },
  });
  const units = rawUnits.map((u) => ({ ...u, basePriceAmount: u.basePriceAmount.toString() }));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <header className="max-w-4xl">
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-led"
          href="/provider/circuitos"
        >
          <span aria-hidden>←</span> Circuitos OOH
        </Link>
        <h1 className="font-display mt-4 text-3xl font-normal uppercase tracking-wide text-foreground">
          Nuevo circuito
        </h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Agrupá unidades de tu inventario para ofrecerlas como un paquete comercial.
        </p>
      </header>
      <div className="max-w-4xl">
        <CircuitForm units={units} />
      </div>
    </div>
  );
}
