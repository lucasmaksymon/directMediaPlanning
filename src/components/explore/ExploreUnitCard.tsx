import Link from "next/link";
import type { ExploreUnitDTO } from "@/lib/explore-query";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ExploreUnitCard({ u }: { u: ExploreUnitDTO }) {
  const hasPin = u.lat != null && u.lng != null;

  return (
    <li>
      <Link
        className={cn(
          "group flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm transition nm-glow duration-250",
          "hover:border-led/40 hover:shadow-md dark:bg-gradient-to-b dark:from-ocean dark:to-[#071012]",
        )}
        href={`/explorar/${u.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug text-foreground group-hover:text-led dark:group-hover:text-led">
              {u.name}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{u.locationLabel}</p>
          </div>
          {hasPin && (
            <span
              className="shrink-0 rounded-full border border-led/30 bg-led/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground"
              title="Incluido en el mapa"
            >
              Mapa
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-border/80 pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Desde</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{formatArs(Number(u.basePriceAmount))}</p>
          </div>
          <p className="max-w-[60%] text-right text-sm text-muted-foreground">{u.providerName}</p>
        </div>
      </Link>
    </li>
  );
}
