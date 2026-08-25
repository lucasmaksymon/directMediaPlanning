"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function SignOutMenuButton({ className }: { className?: string }) {
  return (
    <Button
      className={cn("w-full", className)}
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
      variant="outline"
    >
      Cerrar sesión
    </Button>
  );
}
