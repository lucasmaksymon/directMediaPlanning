import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AdvertiserShell } from "@/components/layout/AdvertiserShell";

export default async function InicioLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const withShell =
    session?.user?.role === "advertiser" || session?.user?.role === "admin";

  if (!withShell) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdvertiserShell>{children}</AdvertiserShell>
    </div>
  );
}
