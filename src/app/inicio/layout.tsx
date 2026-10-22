import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AdvertiserShell } from "@/components/layout/AdvertiserShell";

import { isAdministrationRole, isPlanningRole } from "@/lib/roles";
export default async function InicioLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const withShell = role === "advertiser" || isPlanningRole(role) || isAdministrationRole(role);

  if (!withShell) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdvertiserShell>{children}</AdvertiserShell>
    </div>
  );
}
