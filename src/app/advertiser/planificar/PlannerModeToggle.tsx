"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  currentMode: "form" | "chat";
};

export function PlannerModeToggle({ currentMode }: Props) {
  return (
    <div className="flex shrink-0 gap-2" role="tablist" aria-label="Modo del planificador">
      <Link
        href="/advertiser/planificar"
        role="tab"
        aria-selected={currentMode === "form"}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition",
          currentMode === "form"
            ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,182,199,0.35)]"
            : "border border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        Formulario
      </Link>
      <Link
        href="/advertiser/planificar?modo=chat"
        role="tab"
        aria-selected={currentMode === "chat"}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition",
          currentMode === "chat"
            ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,182,199,0.35)]"
            : "border border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        Chat IA ✦
      </Link>
    </div>
  );
}
