import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import { getFreemiumMaxScreens } from "@/lib/freemium";
import { CmsScreenForm } from "./CmsScreenForm";
import Link from "next/link";

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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">CMS + Player</p>
        <h1 className="font-display mt-1 text-2xl uppercase tracking-wide">Pantallas conectadas</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Plan {profile.organization?.plan ?? "freemium"}: {screenCount}/{maxScreens} pantallas
        </p>
      </div>

      <CmsScreenForm providerId={profile.id} />

      <div className={cn(surfaceCard(), "p-5 space-y-3")}>
        <h2 className="font-semibold">Tus pantallas</h2>
        {profile.screens.map((s) => (
          <div key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{s.deviceKey}</p>
            </div>
            <div className="text-right text-xs">
              <span className={s.isOnline ? "text-led" : "text-muted-foreground"}>
                {s.isOnline ? "Online" : "Offline"}
              </span>
              <Link href={`/player?key=${s.deviceKey}`} className="block text-led underline mt-1">Abrir player web</Link>
            </div>
          </div>
        ))}
        {profile.screens.length === 0 && <p className="text-sm text-muted-foreground">Registrá tu primera pantalla.</p>}
      </div>
    </div>
  );
}
