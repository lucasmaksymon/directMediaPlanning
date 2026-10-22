import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";

import { isPlanningRole } from "@/lib/roles";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || !isPlanningRole(session.user.role)) redirect("/");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
