import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PlannerClient } from "./PlannerClient";
import { PlannerModeToggle } from "./PlannerModeToggle";
import { PlannerChatPanel } from "./PlannerChatPanel";
import { CLIENT_BRAND, productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { advertiserPage } from "@/lib/ui-classes";
import { PageHeader } from "@/components/ui";

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
      <PageHeader
        actions={<PlannerModeToggle currentMode={chatMode ? "chat" : "form"} />}
        description={
          chatMode
            ? undefined
            : "Completá el brief y la IA analiza los espacios disponibles y sugiere la mejor combinación."
        }
        eyebrow="Planificador · IA"
        title="Planificador de campaña"
      />

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
