import type { ReactNode } from "react";
import { ProviderShell } from "@/components/layout/ProviderShell";

export default function ProviderLayout({ children }: { children: ReactNode }) {
  return <ProviderShell>{children}</ProviderShell>;
}
