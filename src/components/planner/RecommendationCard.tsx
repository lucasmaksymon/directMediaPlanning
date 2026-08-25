"use client";

import Link from "next/link";
import { formatArs } from "@/lib/format";

export type UnitDetail = {
  id: string;
  name: string;
  locationLabel: string;
  basePriceAmount: string;
  format: string;
  providerName: string;
};

type Props = {
  unit: UnitDetail;
  score: number;
  justificacion: string;
  selected: boolean;
  onToggle: (id: string) => void;
};

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital OOH",
  static_ooh: "OOH estático",
  digital_package: "Paquete digital",
};

export function RecommendationCard({ unit, score, justificacion, selected, onToggle }: Props) {
  const stars = Math.round(score / 2);

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-[var(--radius-lg)] border p-5 shadow-sm transition duration-250 cursor-pointer ${
        selected
          ? "border-led bg-led/8 shadow-[0_0_24px_rgba(0,182,199,0.2)]"
          : "border-border bg-card hover:border-led/50 "
     }`}
      onClick={() => onToggle(unit.id)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === " " && onToggle(unit.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-foreground">{unit.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{unit.locationLabel}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full border border-led/30 bg-led/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-foreground">
            {formatLabels[unit.format] ?? unit.format}
          </span>
          <span className="text-xs text-muted-foreground">{unit.providerName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < stars ? "text-led" : "text-muted-foreground/30"}>
              ★
            </span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Score {score}/10</span>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{justificacion}</p>

      <div className="flex items-center justify-between border-t border-border/80 pt-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Precio de referencia</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {formatArs(Number(unit.basePriceAmount))}
          </p>
        </div>
        <Link
          className="text-sm font-medium text-led underline underline-offset-2 hover:no-underline"
          href={`/explorar/${unit.id}`}
          onClick={(e) => e.stopPropagation()}
          target="_blank"
        >
          Ver ficha →
        </Link>
      </div>

      {selected && (
        <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-led text-carbon shadow-[0_0_12px_rgba(0,182,199,0.6)]">
          <svg aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
