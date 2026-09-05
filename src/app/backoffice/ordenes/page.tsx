import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, surfaceCard } from "@/lib/ui-classes";
import { PageHeader } from "@/components/ui";
import { ERP_HUB_MODULES } from "@/lib/erp-modules";

export const metadata = { title: productTitle("Órdenes") };

export default function ErpOrdenesHubPage() {
  const mod = ERP_HUB_MODULES[0];
  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader eyebrow="Administración" title={mod.title} />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {mod.items.map((item) => (
          <Link
            className={cn(surfaceCard(), "flex flex-col p-4 transition hover:border-led/40")}
            href={item.href}
            key={item.href}
          >
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
