"use client";

import dynamic from "next/dynamic";

function MapLoadingPlaceholder() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-led/30 bg-gradient-to-b from-muted/80 to-muted/40 shadow-sm ring-1 ring-led/10">
      <div className="flex items-center gap-2.5 border-b border-border/80 bg-card/70 px-4 py-3 backdrop-blur-sm">
        <span className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-muted-foreground/20" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-32 animate-pulse rounded bg-muted-foreground/25" />
          <div className="h-3 w-48 max-w-full animate-pulse rounded bg-muted-foreground/15" />
        </div>
      </div>
      <div className="flex h-[min(360px,50vh)] min-h-[260px] flex-col items-center justify-center gap-3 px-4">
        <div
          aria-hidden
          className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-led"
        />
        <p className="text-sm font-medium text-muted-foreground">Cargando mapa…</p>
      </div>
    </div>
  );
}

const LocationMapPickerInner = dynamic(
  () => import("./LocationMapPickerInner").then((m) => m.LocationMapPickerInner),
  {
    ssr: false,
    loading: () => <MapLoadingPlaceholder />,
  },
);

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
};

export function LocationMapPicker(props: Props) {
  return <LocationMapPickerInner {...props} />;
}
