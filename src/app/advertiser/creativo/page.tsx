import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreativoClient } from "./CreativoClient";

export const metadata = {
  title: "Validar creativo · Direct Planning",
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
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">IA</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground">
          Validar creativo
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-2xl">
          Subí tu arte final y la IA analiza contraste, legibilidad y mensaje para vía pública. 
          También podés generar un mockup fotorrealista de cómo se vería en el espacio.
        </p>
      </header>
      <CreativoClient units={units} />
    </div>
  );
}
