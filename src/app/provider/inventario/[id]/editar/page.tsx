import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { EditInventoryForm } from "./EditInventoryForm";

export const metadata = { title: productTitle("Editar espacio") };

export default async function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) redirect("/provider");

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id, providerId: profile.id },
  });
  if (!unit) notFound();

  return (
    <div className={cn(panelPage, pageScroll, "gap-6 max-w-2xl")}>
      <div>
        <Link href="/provider/inventario" className="text-sm text-muted-foreground hover:text-led">
          ← Mis espacios
        </Link>
        <h1 className="nm-page-title mt-2">Editar espacio</h1>
      </div>
      <EditInventoryForm unit={unit} />
    </div>
  );
}
