"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Overlay";
import { IconButton } from "@/components/ui/IconButton";

export type RoleNavItem = {
  href: string;
  label: string;
  badge?: string;
  /** Exact match only (e.g. dashboard roots). */
  exact?: boolean;
  /** Custom active predicate. */
  match?: (pathname: string) => boolean;
};

export type RoleShellProps = {
  title: string;
  nav: RoleNavItem[];
  children: ReactNode;
  footer?: ReactNode;
};

const COLLAPSE_KEY = "nm-role-shell-collapsed";

function isActive(pathname: string, item: RoleNavItem) {
  if (item.match) return item.match(pathname);
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({
  nav,
  pathname,
  onNavigate,
  collapsed,
}: {
  nav: RoleNavItem[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            className={cn(
              "rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-[var(--duration-fast)]",
              collapsed ? "flex justify-center px-2 py-2.5" : "px-3 py-2",
              active
                ? "bg-primary-subtle font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={item.href}
            key={item.href + item.label}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
          >
            {collapsed ? (
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold",
                  active ? "text-led" : "text-muted-foreground",
                )}
              >
                {item.label.trim().charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "h-4 w-0.5 shrink-0 rounded-full transition-colors",
                    active ? "bg-primary" : "bg-transparent",
                  )}
                />
                <span className="min-w-0 truncate">{item.label}</span>
                {item.badge ? (
                  <Badge className="ml-auto shrink-0" variant="brand">
                    {item.badge}
                  </Badge>
                ) : null}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function RoleShell({ title, nav, children, footer }: RoleShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 w-full overflow-hidden">
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out lg:flex",
          hydrated && collapsed ? "w-14" : "w-56",
        )}
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-divide px-2 py-2">
          {!collapsed ? (
            <p className="min-w-0 flex-1 truncate px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {title}
            </p>
          ) : (
            <span className="flex-1" />
          )}
          <IconButton
            label={collapsed ? "Expandir menú" : "Colapsar menú"}
            onClick={toggleCollapsed}
            size="icon-sm"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </IconButton>
        </div>
        <div className="nm-scroll flex flex-1 flex-col overflow-y-auto px-2 py-3">
          <NavLinks collapsed={hydrated && collapsed} nav={nav} pathname={pathname} />
          {footer && !(hydrated && collapsed) ? (
            <div className="mt-auto border-t border-divide px-1 pt-4">{footer}</div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 lg:hidden">
          <IconButton label="Abrir navegación" onClick={() => setMobileOpen(true)} size="icon-sm">
            <Menu className="size-4" />
          </IconButton>
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        {children}
      </div>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title={title} side="left">
        <div className="px-3 py-4">
          <NavLinks nav={nav} onNavigate={() => setMobileOpen(false)} pathname={pathname} />
          {footer ? <div className="mt-6 border-t border-divide pt-4">{footer}</div> : null}
        </div>
      </Drawer>
    </div>
  );
}

/* ── Role-specific wrappers (stable imports for layouts) ── */

const ADMIN_NAV: RoleNavItem[] = [
  {
    href: "/admin/reservas",
    label: "Reservas",
  },
  {
    href: "/admin/operaciones/inventory",
    label: "Inventario",
    match: (p) =>
      p.startsWith("/admin/operaciones/inventory") && !p.includes("/new"),
  },
  { href: "/admin/operaciones/inventory/new", label: "Nueva unidad" },
  { href: "/admin/operaciones/circuitos", label: "Circuitos" },
  { href: "/admin/presentaciones", label: "Presentaciones" },
  { href: "/admin/operaciones/analytics", label: "Analíticas" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin", label: "Métricas", exact: true },
];

const ADVERTISER_NAV: RoleNavItem[] = [
  { href: "/inicio", label: "Inicio", exact: true },
  { href: "/advertiser/planificar", label: "Planificador IA", badge: "IA" },
  { href: "/advertiser/creativo", label: "Validar creativo", badge: "IA" },
  { href: "/advertiser", label: "Mis solicitudes", exact: true },
  { href: "/advertiser/campanas", label: "Campañas" },
  { href: "/advertiser/creativos", label: "Creativos" },
  { href: "/advertiser/campanas/post-campana", label: "Post-campaña" },
  {
    href: "/explorar",
    label: "Catálogo",
    match: (p) => p === "/explorar" || p.startsWith("/explorar/"),
  },
];

const PROVIDER_NAV: RoleNavItem[] = [
  { href: "/provider", label: "Panel", exact: true },
  { href: "/provider/inventario", label: "Mis espacios" },
  { href: "/provider/cms", label: "CMS / Pantallas" },
  { href: "/provider/reservas", label: "Solicitudes" },
  { href: "/provider/analytics", label: "Analytics" },
];

const AGENCY_NAV: RoleNavItem[] = [
  { href: "/agency", label: "Panel", exact: true },
  { href: "/agency/clientes", label: "Clientes" },
  { href: "/agency/comparar", label: "Comparar espacios" },
  {
    href: "/explorar",
    label: "Explorar catálogo",
    match: (p) => p === "/explorar" || p.startsWith("/explorar/"),
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell
      footer={
        <Link className="nm-caption block px-2 py-1 hover:text-foreground" href="/explorar">
          Ver catálogo →
        </Link>
      }
      nav={ADMIN_NAV}
      title="Operaciones"
    >
      {children}
    </RoleShell>
  );
}

export function AdvertiserShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell nav={ADVERTISER_NAV} title="Anunciante">
      {children}
    </RoleShell>
  );
}

export function ProviderShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell nav={PROVIDER_NAV} title="Medio / Proveedor">
      {children}
    </RoleShell>
  );
}

export function AgencyShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell nav={AGENCY_NAV} title="Agencia">
      {children}
    </RoleShell>
  );
}
