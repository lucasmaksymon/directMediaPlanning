import Link from "next/link";
import type { ExploreUnitDTO } from "@/lib/explore-query";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ExploreUnitCard({ u }: { u: ExploreUnitDTO }) {
  const hasPin = u.lat != null && u.lng != null;

  return (
    <Link
      className={cn(
        "group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition duration-200",
        "hover:border-led/40 hover:shadow-md dark:bg-gradient-to-r dark:from-ocean dark:to-[#071012]",
      )}
      href={`/explorar/${u.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-foreground group-hover:text-led">
          {u.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.locationLabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatArs(Number(u.basePriceAmount))}
        </p>
        {hasPin && (
          <span
            className="rounded-full border border-led/30 bg-led/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-led"
            title="Incluido en el mapa"
          >
            📍
          </span>
        )}
      </div>
    </Link>
  );
}
