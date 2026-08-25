"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/lib/ui-variants";

export type DropdownItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
};

export function Dropdown({
  label,
  items,
  className,
}: {
  label: ReactNode;
  items: DropdownItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("relative inline-block", className)} ref={ref}>
      <button
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="menu"
        className={buttonVariants({ variant: "outline", size: "sm" })}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {label}
      </button>
      {open ? (
        <div
          className="absolute right-0 z-[var(--z-dropdown)] mt-1 min-w-[10rem] overflow-hidden rounded-[var(--radius-md)] border border-border bg-card py-1 shadow-[var(--shadow-md)]"
          id={id}
          role="menu"
        >
          {items.map((item) => {
            const cls = cn(
              "block w-full px-3 py-2 text-left text-sm transition hover:bg-muted",
              item.destructive ? "text-error" : "text-foreground",
            );
            if (item.href) {
              return (
                <Link
                  className={cls}
                  href={item.href}
                  key={item.label}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                className={cls}
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
