"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      onBlur={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-[var(--z-dropdown)] mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm"
          id={id}
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
