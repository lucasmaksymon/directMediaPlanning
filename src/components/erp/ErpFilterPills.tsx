import Link from "next/link";
import { cn } from "@/lib/cn";

/** Filtro por link (GET) con el estilo de TabsList. */
export function ErpFilterPills({
  items,
}: {
  items: { href: string; label: string; active: boolean }[];
}) {
  return (
    <div className="inline-flex shrink-0 gap-1 self-start rounded-[var(--radius-md)] border border-border bg-muted/50 p-1">
      {items.map((item) => (
        <Link
          className={cn(
            "rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm font-medium transition",
            item.active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
