import type { ReactNode } from "react";
import { Label } from "@/components/ui";
import { cn } from "@/lib/cn";

export function ErpField({
  label,
  htmlFor,
  children,
  wide,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", wide && "sm:col-span-2 xl:col-span-4")}>
      <Label className="text-xs text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
    </div>
  );
}
