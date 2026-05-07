"use client";

import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";

export function SignOutMenuButton({ className }: { className?: string }) {
  return (
    <button
      className={cn(
        "w-full rounded-full border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition duration-250 hover:bg-muted",
        className,
      )}
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Cerrar sesión
    </button>
  );
}
