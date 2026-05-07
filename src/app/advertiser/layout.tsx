import type { ReactNode } from "react";
import { AdvertiserShell } from "@/components/layout/AdvertiserShell";

export default function AdvertiserLayout({ children }: { children: ReactNode }) {
  return <AdvertiserShell>{children}</AdvertiserShell>;
}
