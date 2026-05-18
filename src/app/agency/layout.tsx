import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AgencyShell } from "@/components/layout/AgencyShell";

export default async function AgencyLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "agency" && session.user.role !== "admin")) {
    redirect("/");
  }
  return <AgencyShell>{children}</AgencyShell>;
}
