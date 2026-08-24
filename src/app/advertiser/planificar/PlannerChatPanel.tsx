"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";

const ChatPlanner = dynamic(() => import("./ChatPlanner").then((m) => m.ChatPlanner), {
  ssr: false,
  loading: () => (
    <div
      className={cn(
        surfaceCard(),
        "flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8",
      )}
    >
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

export function PlannerChatPanel({ unitDetails }: { unitDetails: UnitDetail[] }) {
  return <ChatPlanner unitDetails={unitDetails} />;
}
