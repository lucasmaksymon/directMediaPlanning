"use client";

import dynamic from "next/dynamic";
import type { ExploreMapMarker } from "@/lib/explore-query";

const ExploreMapInner = dynamic(
  () => import("./ExploreMapInner").then((m) => m.ExploreMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(75dvh,900px)] min-h-[22rem] w-full items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted/60 text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

export function ExploreMap({ markers }: { markers: ExploreMapMarker[] }) {
  return <ExploreMapInner markers={markers} />;
}
