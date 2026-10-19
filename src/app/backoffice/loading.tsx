import { cn } from "@/lib/cn";
import { adminPage } from "@/lib/ui-classes";
import { Skeleton } from "@/components/ui";

export default function BackofficeLoading() {
  return (
    <div aria-busy aria-label="Cargando" className={cn(adminPage, "gap-4")}>
      <Skeleton className="h-12 w-72 shrink-0" />
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton className="h-20" key={i} />
        ))}
      </div>
      <Skeleton className="min-h-64 flex-1" />
    </div>
  );
}
