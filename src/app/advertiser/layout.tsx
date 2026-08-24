import type { ReactNode } from "react";
import { AdvertiserShell } from "@/components/layout/AdvertiserShell";

export default function AdvertiserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdvertiserShell>{children}</AdvertiserShell>
    </div>
  );
}
