import Link from "next/link";
import type { ExploreUnitDTO } from "@/lib/explore-query";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";

export function ExploreUnitCard({ u }: { u: ExploreUnitDTO }) {
  const hasPin = u.lat != null && u.lng != null;

  return (
    <Link
      className={cn(
        surfaceCard(),
        "group flex w-full min-w-0 items-start justify-between gap-3 overflow-hidden px-4 py-3 transition duration-200",
        "hover:border-primary/40 hover:bg-muted/30",
      )}
      href={`/explorar/${u.id}`}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-semibold leading-tight text-foreground group-hover:text-led">
          {u.name}
        </p>
        {u.providerName ? (
          <p className="mt-0.5 truncate text-xs font-medium text-led/90">{u.providerName}</p>
        ) : null}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.locationLabel}</p>
      </div>
      <div className="flex max-w-[40%] shrink-0 flex-col items-end gap-1">
        <p className="text-right text-sm font-semibold tabular-nums leading-tight text-foreground">
          {formatArs(Number(u.basePriceAmount))}
        </p>
        {hasPin && (
          <span
            className="rounded-[var(--radius-md)] border border-led/30 bg-led/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-led"
            title="Incluido en el mapa"
          >
            Mapa
          </span>
        )}
      </div>
    </Link>
  );
}
