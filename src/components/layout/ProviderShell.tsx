"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const NAV: { href: string; label: string }[] = [
  { href: "/inicio", label: "Dashboard" },
  { href: "/provider", label: "Resumen" },
  { href: "/provider/inventory", label: "Inventario" },
  { href: "/provider/inventory/new", label: "Nueva unidad" },
  { href: "/provider/reservations", label: "Solicitudes" },
  { href: "/provider/analytics", label: "Analíticas" },
  { href: "/provider/circuitos", label: "Circuitos OOH" },
];

function navActive(pathname: string, href: string) {
  if (href === "/inicio") return pathname === "/inicio";
  if (href === "/provider") return pathname === "/provider";
  if (href === "/provider/inventory/new") return pathname.startsWith("/provider/inventory/new");
  if (href === "/provider/inventory") {
    return pathname.startsWith("/provider/inventory") && !pathname.startsWith("/provider/inventory/new");
  }
  if (href === "/provider/reservations") return pathname.startsWith("/provider/reservations");
  if (href === "/provider/analytics") return pathname.startsWith("/provider/analytics");
  if (href === "/provider/circuitos") return pathname.startsWith("/provider/circuitos");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProviderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border/90 bg-sidebar/95 backdrop-blur-sm lg:flex">
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-6">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Medio</p>
          <nav aria-label="Secciones del medio" className="mt-3 flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <Link
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium transition duration-250",
                    active
                      ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_20px_rgba(0,182,199,0.35)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
      <div className="min-w-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
