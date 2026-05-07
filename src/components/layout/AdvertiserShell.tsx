"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const NAV: { href: string; label: string; badge?: string }[] = [
  { href: "/inicio", label: "Dashboard" },
  { href: "/advertiser/planificar", label: "Planificador IA", badge: "IA" },
  { href: "/advertiser", label: "Mis solicitudes" },
  { href: "/explorar", label: "Catálogo" },
];

function navActive(pathname: string, href: string) {
  if (href === "/inicio") return pathname === "/inicio";
  if (href === "/advertiser/planificar") return pathname.startsWith("/advertiser/planificar");
  if (href === "/advertiser") return pathname === "/advertiser";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdvertiserShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl">
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 flex-col border-r border-border/90 bg-sidebar/95 backdrop-blur-sm lg:flex">
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-6">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Anunciante
          </p>
          <nav aria-label="Secciones" className="mt-3 flex flex-col gap-0.5">
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
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.badge && (
                      <span className="rounded-full border border-led/30 bg-led/15 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-led">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:max-w-[min(100%,48rem)] lg:pr-12 xl:max-w-none">
        {children}
      </div>
    </div>
  );
}
