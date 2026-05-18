import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { AgencyClientsManager } from "./AgencyClientsManager";

export const metadata = { title: "Clientes · Agencia · Direct Planning" };

export default async function AgencyClientesPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "agency" && session.user.role !== "admin")) redirect("/");

  const agencyProfile = await prisma.agencyProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      clients: {
        include: {
          advertiser: {
            select: {
              id: true, email: true,
              advertiserProfile: { select: { legalName: true } },
              _count: { select: { reservations: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!agencyProfile) redirect("/agency");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Agencia</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground">
          Mis clientes
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Gestioná los anunciantes asociados a tu agencia. Podés ver sus campañas de forma consolidada.
        </p>
      </header>
      <div className="max-w-2xl">
        <AgencyClientsManager initialClients={agencyProfile.clients} />
      </div>
    </div>
  );
}
