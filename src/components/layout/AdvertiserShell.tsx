"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const NAV: { href: string; label: string; badge?: string }[] = [
  { href: "/inicio", label: "Inicio" },
  { href: "/advertiser/planificar", label: "Planificador IA", badge: "IA" },
  { href: "/advertiser/creativo", label: "Validar creativo", badge: "IA" },
  { href: "/advertiser", label: "Mis solicitudes" },
  { href: "/advertiser/campanas", label: "Campañas" },
  { href: "/advertiser/creativos", label: "Creativos" },
  { href: "/advertiser/campanas/post-campana", label: "Post-campaña" },
  { href: "/explorar", label: "Catálogo" },
];

function navActive(pathname: string, href: string) {
  if (href === "/inicio") return pathname === "/inicio";
  if (href === "/advertiser/planificar") return pathname.startsWith("/advertiser/planificar");
  if (href === "/advertiser/creativo") return pathname.startsWith("/advertiser/creativo");
  if (href === "/advertiser") return pathname === "/advertiser";
  if (href === "/advertiser/campanas") return pathname.startsWith("/advertiser/campanas");
  if (href === "/advertiser/creativos") return pathname.startsWith("/advertiser/creativos");
  if (href === "/explorar") return pathname === "/explorar" || pathname.startsWith("/explorar/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdvertiserShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 w-full overflow-hidden">
      <aside className="hidden h-full w-52 shrink-0 flex-col border-r border-border/90 bg-sidebar/95 backdrop-blur-sm lg:flex">
        <div className="nm-scroll flex flex-1 flex-col overflow-y-auto px-3 py-6">
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
                    <span className="min-w-0 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="shrink-0 rounded-full border border-led/30 bg-led/15 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-led">
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
