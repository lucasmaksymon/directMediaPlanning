import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");
  return <AdminShell>{children}</AdminShell>;
}
