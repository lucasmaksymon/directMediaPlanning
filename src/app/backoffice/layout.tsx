import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BackofficeShell } from "@/components/layout/AdminShell";

import { isAdministrationRole } from "@/lib/roles";
export default async function BackofficeLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || !isAdministrationRole(session.user.role)) redirect("/");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackofficeShell>{children}</BackofficeShell>
    </div>
  );
}
