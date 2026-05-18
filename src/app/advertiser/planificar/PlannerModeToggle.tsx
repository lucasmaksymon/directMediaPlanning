"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

const ChatPlanner = dynamic(() => import("./ChatPlanner").then((m) => m.ChatPlanner), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-3xl border border-border bg-muted/50">
      <p className="text-sm text-muted-foreground">Cargando chat…</p>
    </div>
  ),
});

type UnitDetail = {
  id: string;
  name: string;
  locationLabel: string;
  basePriceAmount: string;
  format: string;
  providerName: string;
};

type Props = {
  currentMode: "form" | "chat";
  showChat?: boolean;
  unitDetails?: UnitDetail[];
};

export function PlannerModeToggle({ currentMode, showChat, unitDetails }: Props) {
  if (showChat) {
    return (
      <div className="h-full">
        <ChatPlanner unitDetails={unitDetails} />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Link
        href="/advertiser/planificar"
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition",
          currentMode === "form"
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        Formulario
      </Link>
      <Link
        href="/advertiser/planificar?modo=chat"
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition",
          currentMode === "chat"
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        Chat IA ✦
      </Link>
    </div>
  );
}
