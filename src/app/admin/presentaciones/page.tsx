import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminOpsPage, adminOpsPageBody, adminOpsPageHeader } from "@/lib/ui-classes";
import { PresentationBuilder } from "./PresentationBuilder";

export const metadata = { title: productTitle("Presentaciones") };

export default async function AdminPresentacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rawUnits = await prisma.inventoryUnit.findMany({
    where: { status: { in: ["published", "draft"] } },
    select: {
      id: true,
      name: true,
      locationLabel: true,
      description: true,
      imageUrls: true,
      metadata: true,
      format: true,
      latitude: true,
      longitude: true,
      provider: { select: { companyName: true } },
    },
    orderBy: [{ provider: { companyName: "asc" } }, { name: "asc" }],
  });

  const units = rawUnits.map((u) => ({
    ...u,
    imageUrls: u.imageUrls.slice(0, 1),
  }));

  return (
    <div className={cn(adminOpsPage, "gap-2 py-3")}>
      <header className={adminOpsPageHeader}>
        <h1 className="nm-page-title text-xl">Presentaciones</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Elegí carteles, previsualizá y exportá PDF o PowerPoint.
        </p>
      </header>
      <div className={adminOpsPageBody}>
        <PresentationBuilder units={units} />
      </div>
    </div>
  );
}
