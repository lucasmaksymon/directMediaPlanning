import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProviderShell } from "@/components/layout/ProviderShell";

import { isInternalRole } from "@/lib/roles";
export default async function ProviderLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "provider" && !isInternalRole(session.user.role))) {
    redirect("/");
  }
  return <ProviderShell>{children}</ProviderShell>;
}
