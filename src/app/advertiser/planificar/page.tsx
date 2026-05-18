import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PlannerClient } from "./PlannerClient";
import { PlannerModeToggle } from "./PlannerModeToggle";

export const metadata = {
  title: "Planificador de campaña · Direct Planning",
  description: "Describí tu campaña y la IA selecciona los mejores espacios para vos.",
};

export default async function PlanificadorPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "advertiser" && session.user.role !== "admin") redirect("/");

  const { modo } = await searchParams;
  const useChatMode = modo === "chat";

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

  if (useChatMode) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="shrink-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">IA</p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <h1 className="font-display text-2xl font-normal uppercase tracking-wide text-foreground sm:text-3xl">
              Planificador de campaña
            </h1>
            <PlannerModeToggle currentMode="chat" />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <PlannerModeToggle currentMode="chat" showChat unitDetails={unitDetails} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">IA</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
          Planificador de campaña
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Completá el brief y la IA analiza los espacios disponibles y sugiere la mejor combinación.
        </p>
      </header>

      <PlannerModeToggle currentMode="form" />

      <div className="w-full max-w-4xl">
        <PlannerClient unitDetails={unitDetails} />
      </div>
    </div>
  );
}
