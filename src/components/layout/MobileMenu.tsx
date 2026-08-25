"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignOutMenuButton } from "@/components/layout/SignOutMenuButton";
import { IconButton } from "@/components/ui/IconButton";

export type MobileNavItem = {
  href: string;
  label: string;
};

type Props = {
  items: MobileNavItem[];
  sections?: { title: string; items: MobileNavItem[] }[];
  showSignOut?: boolean;
};

export function MobileMenu({ items, sections, showSignOut }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <IconButton
        aria-controls="app-mobile-menu"
        aria-expanded={open}
        className="border border-border bg-card md:hidden"
        label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen(true)}
        size="icon-sm"
        variant="outline"
      >
        <Menu className="size-4" />
      </IconButton>

      {open ? (
        <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" id="app-mobile-menu" role="dialog">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-carbon/45"
            type="button"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-border bg-card shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between border-b border-divide px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Menú</p>
              <IconButton label="Cerrar" onClick={() => setOpen(false)} size="icon-sm">
                <X className="size-4" />
              </IconButton>
            </div>
            <nav className="nm-scroll flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      className="block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                      href={item.href}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {sections?.map((sec) => (
                <div className="mt-6" key={sec.title}>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {sec.title}
                  </p>
                  <ul className="space-y-0.5">
                    {sec.items.map((item) => (
                      <li key={item.href + item.label}>
                        <Link
                          className="block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                          href={item.href}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            {showSignOut ? (
              <div className="border-t border-divide p-3">
                <SignOutMenuButton />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
