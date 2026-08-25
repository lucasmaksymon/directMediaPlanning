"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
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

function isActive(pathname: string, item: RoleNavItem) {
  if (item.match) return item.match(pathname);
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({
  nav,
  pathname,
  onNavigate,
}: {
  nav: RoleNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            className={cn(
              "rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
              active
                ? "bg-primary-subtle font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={item.href}
            key={item.href + item.label}
            onClick={onNavigate}
          >
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
          </Link>
        );
      })}
    </nav>
  );
}

export function RoleShell({ title, nav, children, footer }: RoleShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 w-full overflow-hidden">
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="nm-scroll flex flex-1 flex-col overflow-y-auto px-3 py-5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </p>
          <div className="mt-3">
            <NavLinks nav={nav} pathname={pathname} />
          </div>
          {footer ? <div className="mt-auto border-t border-divide pt-4 px-1">{footer}</div> : null}
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
