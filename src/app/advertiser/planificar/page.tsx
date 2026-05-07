import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PlannerClient } from "./PlannerClient";

export const metadata = {
  title: "Planificador de campaña · Direct Planning",
  description: "Describí tu campaña y la IA selecciona los mejores espacios para vos.",
};

export default async function PlanificadorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "advertiser" && session.user.role !== "admin") redirect("/");

  /* Pre-cargar todos los detalles de unidades publicadas para el cliente */
  const units = await prisma.inventoryUnit.findMany({
    where: { status: "published" },
    include: { provider: { select: { companyName: true } } },
    orderBy: { basePriceAmount: "asc" },
  });

  const unitDetails = units.map((u) => ({
    id: u.id,
    name: u.name,
    locationLabel: u.locationLabel,
    basePriceAmount: u.basePriceAmount.toString(),
    format: u.format,
    providerName: u.provider.companyName,
  }));

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">IA</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
          Planificador de campaña
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Describí tu objetivo, zona, presupuesto y fechas. La IA analiza los espacios disponibles y te
          sugiere la mejor combinación. Luego podés solicitar todos de un click.
        </p>
      </header>

      <PlannerClient unitDetails={unitDetails} />
    </div>
  );
}
