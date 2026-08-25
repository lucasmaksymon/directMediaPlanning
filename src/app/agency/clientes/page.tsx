import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import { PageHeader } from "@/components/ui";
import { AgencyClientsManager } from "./AgencyClientsManager";

export const metadata = { title: productTitle("Clientes · Agencia") };

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
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader
        description="Gestioná los anunciantes asociados a tu agencia. Podés ver sus campañas de forma consolidada."
        eyebrow="Agencia"
        title="Mis clientes"
      />
      <div className="max-w-2xl">
        <AgencyClientsManager initialClients={agencyProfile.clients} />
      </div>
    </div>
  );
}
