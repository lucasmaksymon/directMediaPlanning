import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import { getFreemiumMaxScreens } from "@/lib/freemium";
import Link from "next/link";
import { EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { CmsScreenForm } from "./CmsScreenForm";

export const metadata = { title: productTitle("CMS") };

export default async function ProviderCmsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      screens: { orderBy: { createdAt: "desc" } },
      organization: true,
    },
  });
  if (!profile) redirect("/provider");

  const maxScreens = profile.organization?.maxScreens ?? (await getFreemiumMaxScreens());
  const screenCount = profile.screens.length;

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader
        description={`Plan ${profile.organization?.plan ?? "freemium"}: ${screenCount}/${maxScreens} pantallas`}
        eyebrow="CMS + Player"
        title="Pantallas conectadas"
      />

      <CmsScreenForm providerId={profile.id} />

      <div className={cn(surfaceCard(), "space-y-3 p-5")}>
        <SectionHeader title="Tus pantallas" />
        {profile.screens.length === 0 ? (
          <EmptyState description="Registrá tu primera pantalla." title="Sin pantallas" />
        ) : (
          profile.screens.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{s.deviceKey}</p>
              </div>
              <div className="text-right text-xs">
                <span className={s.isOnline ? "text-led" : "text-muted-foreground"}>
                  {s.isOnline ? "Online" : "Offline"}
                </span>
                <Link className="mt-1 block text-led underline" href={`/player?key=${s.deviceKey}`}>
                  Abrir player web
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
