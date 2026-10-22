import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AgencyShell } from "@/components/layout/AgencyShell";

import { isAdminRole } from "@/lib/roles";
export default async function AgencyLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "agency" && !isAdminRole(session.user.role))) {
    redirect("/");
  }
  return <AgencyShell>{children}</AgencyShell>;
}
