"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/agency", label: "Panel" },
  { href: "/agency/clientes", label: "Clientes" },
  { href: "/explorar", label: "Explorar catálogo" },
];

function navActive(pathname: string, href: string) {
  if (href === "/agency") return pathname === "/agency";
  return pathname.startsWith(href);
}

export function AgencyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border/90 bg-sidebar/95 backdrop-blur-sm lg:flex">
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-6">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agencia</p>
          <nav className="mt-3 flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <Link
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium transition duration-250",
                    active ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_20px_rgba(0,182,199,0.35)]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </div>
  );
}
