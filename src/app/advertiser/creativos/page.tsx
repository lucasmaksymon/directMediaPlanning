import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Creativos</p>
        <h1 className="font-display mt-1 text-2xl uppercase tracking-wide">Biblioteca</h1>
      </div>
      <CreativeLibraryForm />
      <div className={cn(surfaceCard(), "p-5")}>
        <h2 className="font-semibold mb-3">Tus archivos</h2>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no cargaste creativos.</p>
        ) : (
          <ul className="space-y-2">
            {assets.map((a) => (
              <li key={a.id} className="text-sm flex justify-between gap-2">
                <span>{a.name}</span>
                <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-led underline text-xs">Ver</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
