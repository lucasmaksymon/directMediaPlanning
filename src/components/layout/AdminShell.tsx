"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/operaciones/inventory", label: "Inventario" },
  { href: "/admin/operaciones/inventory/new", label: "Nueva unidad" },
  { href: "/admin/operaciones/circuitos", label: "Circuitos" },
  { href: "/admin/operaciones/analytics", label: "Analíticas" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin", label: "Métricas" },
];

function navActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/operaciones/inventory") {
    return pathname.startsWith("/admin/operaciones/inventory") && !pathname.includes("/new");
  }
  return pathname.startsWith(href);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-0 flex-1 w-full overflow-hidden">
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border/90 bg-sidebar/95 backdrop-blur-sm lg:flex">
        <div className="nm-scroll flex flex-1 flex-col overflow-y-auto px-3 py-6">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Operaciones
          </p>
          <nav className="mt-3 flex flex-col gap-0.5">
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
          <div className="mt-auto pt-6 px-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Accesos rápidos
            </p>
            <Link className="block text-xs text-muted-foreground hover:text-foreground py-1" href="/explorar">
              Ver catálogo →
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
