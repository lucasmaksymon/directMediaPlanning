import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { CreateCampaignForm } from "./CreateCampaignForm";

export const metadata = { title: productTitle("Mis campañas") };

export default async function CampanasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "advertiser") redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId: session.user.id },
    include: { _count: { select: { reservations: true, creatives: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader eyebrow="Campañas" title="Mis campañas" />

      <CreateCampaignForm />

      <div className="grid gap-4">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/advertiser/campanas/${c.id}`}
            className={cn(surfaceCard(), "block p-5 transition hover:border-led/40")}
          >
            <h2 className="font-semibold text-foreground">{c.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {c._count.reservations} reservas · {c._count.creatives} creativos · {c.status}
            </p>
          </Link>
        ))}
        {campaigns.length === 0 && (
          <EmptyState
            description="Creá tu primera campaña para agrupar reservas y creativos."
            title="Sin campañas"
          />
        )}
      </div>
    </div>
  );
}
