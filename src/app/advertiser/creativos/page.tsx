import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import { EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { CreativeLibraryForm } from "./CreativeLibraryForm";

export const metadata = { title: productTitle("Biblioteca de creativos") };

export default async function CreativosLibraryPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "advertiser") redirect("/login");

  const assets = await prisma.creativeAsset.findMany({
    where: { advertiserId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader eyebrow="Creativos" title="Biblioteca" />
      <CreativeLibraryForm />
      <div className={cn(surfaceCard(), "p-5")}>
        <SectionHeader className="mb-3" title="Tus archivos" />
        {assets.length === 0 ? (
          <EmptyState description="Aún no cargaste creativos." title="Biblioteca vacía" />
        ) : (
          <ul className="space-y-2">
            {assets.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 text-sm">
                <span>{a.name}</span>
                <a
                  className="text-xs text-led underline"
                  href={a.fileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Ver
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
