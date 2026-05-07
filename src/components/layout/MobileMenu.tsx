"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutMenuButton } from "@/components/layout/SignOutMenuButton";

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
      <button
        aria-controls="app-mobile-menu"
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition duration-250 hover:bg-muted md:hidden"
        type="button"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] md:hidden" id="app-mobile-menu" role="dialog">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            type="button"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-border bg-card shadow-2xl nm-glow">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Menú</p>
              <button
                aria-label="Cerrar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                type="button"
                onClick={() => setOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
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
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {sec.title}
                  </p>
                  <ul className="space-y-1">
                    {sec.items.map((item) => (
                      <li key={item.href + item.label}>
                        <Link
                          className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
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
              <div className="border-t border-border p-3">
                <SignOutMenuButton />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
