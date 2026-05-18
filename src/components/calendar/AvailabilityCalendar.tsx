"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { CalendarBlock } from "@/app/actions/availability";

type Props = {
  blocks: CalendarBlock[];
  readonly?: boolean;
  onDeleteBlock?: (id: string) => void;
};

const DAYS = ["D", "L", "M", "X", "J", "V", "S"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isBetween(date: Date, start: Date, end: Date) {
  const d = dateOnly(date).getTime();
  return d >= dateOnly(start).getTime() && d <= dateOnly(end).getTime();
}

function getDayState(date: Date, blocks: CalendarBlock[]): { state: string; label?: string; id?: string; source?: string } | null {
  for (const b of blocks) {
    if (isBetween(date, b.startsAt, b.endsAt)) {
      return { state: b.state, label: b.label, id: b.id, source: b.source };
    }
  }
  return null;
}

const stateBg: Record<string, string> = {
  available: "bg-led/20 text-led hover:bg-led/30",
  blocked: "bg-signal/20 text-signal",
  reserved_pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  reserved_confirmed: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
};

const stateLabel: Record<string, string> = {
  available: "Disponible",
  blocked: "Bloqueado",
  reserved_pending: "Pendiente",
  reserved_confirmed: "Reservado",
};

export function AvailabilityCalendar({ blocks, readonly, onDeleteBlock }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells = startOffset + lastDay.getDate();
  const cells = Array.from({ length: Math.ceil(totalCells / 7) * 7 }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    return new Date(year, month, dayNum);
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="space-y-4">
      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(stateLabel).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-3 w-3 rounded-full", stateBg[k]?.split(" ")[0])} />
            {v}
          </span>
        ))}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} type="button" className="rounded-full px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted transition">← Ant.</button>
        <p className="text-sm font-semibold text-foreground">{MONTHS[month]} {year}</p>
        <button onClick={nextMonth} type="button" className="rounded-full px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted transition">Sig. →</button>
      </div>

      {/* Grilla días */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const dayState = getDayState(date, blocks);
          const isToday = dateOnly(date).getTime() === dateOnly(today).getTime();

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "relative flex h-9 w-full flex-col items-center justify-center rounded-lg text-xs font-medium transition",
                isToday && "ring-1 ring-led ring-offset-1",
                dayState ? stateBg[dayState.state] : "text-muted-foreground hover:bg-muted",
                !readonly && dayState?.source === "availability" && dayState?.id && "cursor-pointer",
              )}
              title={dayState ? `${stateLabel[dayState.state]}${dayState.label ? ` (${dayState.label})` : ""}` : undefined}
              onClick={() => {
                if (!readonly && onDeleteBlock && dayState?.source === "availability" && dayState?.id) {
                  if (confirm("¿Quitar este bloque de disponibilidad?")) {
                    onDeleteBlock(dayState.id);
                  }
                }
              }}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
