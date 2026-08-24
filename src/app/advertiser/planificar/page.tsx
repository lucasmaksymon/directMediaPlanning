import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PlannerClient } from "./PlannerClient";
import { PlannerModeToggle } from "./PlannerModeToggle";
import { PlannerChatPanel } from "./PlannerChatPanel";
import { CLIENT_BRAND, productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPageHeader, advertiserPage } from "@/lib/ui-classes";

export const metadata = {
  title: productTitle("Planificador"),
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
  const chatMode = modo === "chat";

  const units = await prisma.inventoryUnit.findMany({
    where: { status: "published" },
    orderBy: { basePriceAmount: "asc" },
  });

  const unitDetails = units.map((u) => ({
    id: u.id,
    name: u.name,
    locationLabel: u.locationLabel,
    basePriceAmount: u.basePriceAmount.toString(),
    format: u.format,
    providerName: CLIENT_BRAND,
  }));

  return (
    <div className={cn(advertiserPage, chatMode ? "gap-3" : "gap-5")}>
      <header className={cn(adminPageHeader, "space-y-3")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-led">
          Planificador · IA
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-normal uppercase tracking-wide text-foreground sm:text-3xl">
              Planificador de campaña
            </h1>
            {!chatMode && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Completá el brief y la IA analiza los espacios disponibles y sugiere la mejor
                combinación.
              </p>
            )}
          </div>
          <PlannerModeToggle currentMode={chatMode ? "chat" : "form"} />
        </div>
      </header>

      {chatMode ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <PlannerChatPanel unitDetails={unitDetails} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PlannerClient unitDetails={unitDetails} />
        </div>
      )}
    </div>
  );
}
