"use client";

import dynamic from "next/dynamic";
import type { ExploreUnitDTO } from "@/lib/explore-query";

const ExploreMapInner = dynamic(
  () => import("./ExploreMapInner").then((m) => m.ExploreMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(60vh,520px)] min-h-[360px] w-full items-center justify-center rounded-3xl border border-border bg-muted/60 text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

export function ExploreMap({ units }: { units: ExploreUnitDTO[] }) {
  return <ExploreMapInner units={units} />;
}
