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
      basePriceAmount: true,
      provider: { select: { companyName: true } },
    },
    orderBy: [{ provider: { companyName: "asc" } }, { name: "asc" }],
  });

  const units = rawUnits.map((u) => ({
    ...u,
    imageUrls: u.imageUrls.slice(0, 1),
    basePriceAmount: u.basePriceAmount.toString(),
  }));

  return (
    <div className={cn(adminOpsPage, "min-w-0 gap-2 overflow-x-hidden overflow-y-auto px-4 py-3 lg:overflow-hidden lg:px-5 xl:px-6")}>
      <header className={cn(adminOpsPageHeader, "flex flex-wrap items-baseline gap-x-3")}>
        <h1 className="nm-page-title text-xl">Presentaciones</h1>
        <p className="text-xs text-muted-foreground">
          Elegí carteles, previsualizá y exportá PDF o PowerPoint.
        </p>
      </header>
      <div className={cn(adminOpsPageBody, "min-w-0 overflow-x-hidden overflow-y-auto lg:overflow-hidden")}>
        <PresentationBuilder units={units} />
      </div>
    </div>
  );
}
