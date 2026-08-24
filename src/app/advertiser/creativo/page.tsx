import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPageHeader, advertiserPage } from "@/lib/ui-classes";
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
      <header className={cn(adminPageHeader, "space-y-2")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-led">
          Creativo · IA
        </p>
        <h1 className="font-display text-2xl font-normal uppercase tracking-wide text-foreground sm:text-3xl">
          Validar creativo
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Subí tu arte final y la IA analiza contraste, legibilidad y mensaje para vía pública.
          También podés generar un mockup orientativo del espacio.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <CreativoClient units={units} />
      </div>
    </div>
  );
}
