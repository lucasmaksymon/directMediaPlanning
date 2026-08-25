import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { advertiserPage } from "@/lib/ui-classes";
import { PageHeader } from "@/components/ui";
import { CreativoClient } from "./CreativoClient";

export const metadata = {
  title: productTitle("Validar creativo"),
  description: "Validación automática de artes OOH con IA + generación de mockup.",
};

export default async function CreativoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "advertiser" && session.user.role !== "admin") redirect("/");

  const units = await prisma.inventoryUnit.findMany({
    where: { status: "published" },
    select: { id: true, name: true, locationLabel: true, format: true, description: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className={cn(advertiserPage, "gap-5")}>
      <PageHeader
        description="Subí tu arte final y la IA analiza contraste, legibilidad y mensaje para vía pública. También podés generar un mockup orientativo del espacio."
        eyebrow="Creativo · IA"
        title="Validar creativo"
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <CreativoClient units={units} />
      </div>
    </div>
  );
}
