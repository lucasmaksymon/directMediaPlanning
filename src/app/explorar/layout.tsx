import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ExplorarLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return children;
}
