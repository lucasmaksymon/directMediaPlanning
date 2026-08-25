"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  currentMode: "form" | "chat";
};

export function PlannerModeToggle({ currentMode }: Props) {
  return (
    <div
      className="inline-flex gap-1 rounded-[var(--radius-md)] border border-border bg-muted/50 p-1"
      role="tablist"
      aria-label="Modo del planificador"
    >
      <Link
        href="/advertiser/planificar"
        role="tab"
        aria-selected={currentMode === "form"}
        className={cn(
          "rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm font-medium transition",
          currentMode === "form"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Formulario
      </Link>
      <Link
        href="/advertiser/planificar?modo=chat"
        role="tab"
        aria-selected={currentMode === "chat"}
        className={cn(
          "rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm font-medium transition",
          currentMode === "chat"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Chat IA
      </Link>
    </div>
  );
}
