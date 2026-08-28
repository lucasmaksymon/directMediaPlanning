"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  Columns2,
  FileText,
  Gauge,
  GitBranch,
  Home,
  ImagePlus,
  Images,
  Inbox,
  Landmark,
  LayoutDashboard,
  Map,
  Megaphone,
  Menu,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Receipt,
  Sparkles,
  Table2,
  Tv,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Overlay";
import { IconButton } from "@/components/ui/IconButton";

export type RoleNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  /** Exact match only (e.g. dashboard roots). */
  exact?: boolean;
  /** Custom active predicate. */
  match?: (pathname: string) => boolean;
  /** Group heading in the sidebar. */
  section?: string;
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

function groupNav(nav: RoleNavItem[]) {
  const groups: { title?: string; items: RoleNavItem[] }[] = [];
  for (const item of nav) {
    const last = groups[groups.length - 1];
    if (last && last.title === item.section) last.items.push(item);
    else groups.push({ title: item.section, items: [item] });
  }
  return groups;
}

function NavItemLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: RoleNavItem;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
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
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      {collapsed ? (
        <Icon aria-hidden className={cn("size-4", active ? "text-led" : "text-muted-foreground")} />
      ) : (
        <span className="flex items-center gap-2">
          <Icon
            aria-hidden
            className={cn("size-4 shrink-0", active ? "text-led" : "text-muted-foreground")}
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
  const groups = useMemo(() => groupNav(nav), [nav]);
  const routeSection = useMemo(() => {
    for (const group of groups) {
      if (group.title && group.items.some((item) => isActive(pathname, item))) {
        return group.title;
      }
    }
    return null;
  }, [groups, pathname]);

  const [openSection, setOpenSection] = useState<string | null>(routeSection);

  useEffect(() => {
    setOpenSection(routeSection);
  }, [routeSection]);

  return (
    <nav aria-label="Secciones" className="flex flex-col gap-1">
      {groups.map((group, gi) => {
        const key = `${group.title ?? "g"}-${gi}`;
        if (!group.title) {
          return (
            <div className="flex flex-col gap-0.5" key={key}>
              {group.items.map((item) => (
                <NavItemLink
                  collapsed={collapsed}
                  item={item}
                  key={item.href + item.label}
                  onNavigate={onNavigate}
                  pathname={pathname}
                />
              ))}
            </div>
          );
        }

        const isOpen = openSection === group.title;
        const hasActive = group.items.some((item) => isActive(pathname, item));

        if (collapsed) {
          return isOpen ? (
            <div className="flex flex-col gap-0.5" key={key}>
              {group.items.map((item) => (
                <NavItemLink
                  collapsed
                  item={item}
                  key={item.href + item.label}
                  onNavigate={onNavigate}
                  pathname={pathname}
                />
              ))}
            </div>
          ) : null;
        }

        return (
          <div className="flex flex-col gap-0.5" key={key}>
            <button
              aria-expanded={isOpen}
              className={cn(
                "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)]",
                hasActive || isOpen
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => setOpenSection(isOpen ? null : group.title ?? null)}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">{group.title}</span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-fast)]",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            {isOpen
              ? group.items.map((item) => (
                  <NavItemLink
                    item={item}
                    key={item.href + item.label}
                    onNavigate={onNavigate}
                    pathname={pathname}
                  />
                ))
              : null}
          </div>
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
          hydrated && collapsed ? "w-14" : "w-60",
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

const OPS_NAV: RoleNavItem[] = [
  { href: "/admin", label: "Métricas", icon: Gauge, exact: true },
  { href: "/admin/reservas", label: "Reservas", icon: CalendarCheck },
  {
    href: "/admin/operaciones/inventory",
    label: "Inventario",
    icon: Boxes,
    match: (p) => p.startsWith("/admin/operaciones/inventory"),
  },
  { href: "/admin/operaciones/circuitos", label: "Circuitos", icon: GitBranch },
  { href: "/admin/presentaciones", label: "Presentaciones", icon: Presentation },
  { href: "/admin/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
];

const BACKOFFICE_NAV: RoleNavItem[] = [
  { href: "/backoffice", label: "Inicio", icon: Home, exact: true },
  { href: "/backoffice/gestion", label: "Gestión", icon: Table2 },
  { href: "/backoffice/ordenes/venta", label: "O.P. Venta", icon: FileText, section: "Órdenes" },
  { href: "/backoffice/ordenes/compra", label: "O.P. Compra", icon: FileText, section: "Órdenes" },
  {
    href: "/backoffice/ordenes/produccion",
    label: "O. Producción",
    icon: FileText,
    section: "Órdenes",
  },
  {
    href: "/backoffice/facturacion/pendientes",
    label: "Pagos pendientes",
    icon: Landmark,
    section: "Facturación",
  },
  {
    href: "/backoffice/facturacion/venta",
    label: "Facturas venta",
    icon: Receipt,
    section: "Facturación",
  },
  {
    href: "/backoffice/facturacion/compra",
    label: "Facturas compra",
    icon: Receipt,
    section: "Facturación",
  },
  { href: "/backoffice/facturacion/iva", label: "Compra IVA", icon: Receipt, section: "Facturación" },
  { href: "/backoffice/facturacion/recibos", label: "Recibos", icon: Wallet, section: "Facturación" },
  {
    href: "/backoffice/facturacion/pagos",
    label: "Órdenes de pago",
    icon: Landmark,
    section: "Facturación",
  },
  { href: "/backoffice/facturacion/cheques", label: "Cheques", icon: Landmark, section: "Facturación" },
  { href: "/backoffice/clientes", label: "Clientes", icon: Users, section: "Maestros" },
  { href: "/backoffice/proveedores", label: "Proveedores", icon: Building2, section: "Maestros" },
  { href: "/backoffice/gastos", label: "Gastos", icon: Wallet, section: "Maestros" },
  { href: "/backoffice/informe", label: "Informe mensual", icon: Table2, section: "Maestros" },
  { href: "/backoffice/config/empresas", label: "Empresas", icon: Building2, section: "Configuración" },
  { href: "/backoffice/config/plazas", label: "Plazas", icon: Map, section: "Configuración" },
  { href: "/backoffice/config/elementos", label: "Elementos", icon: Columns2, section: "Configuración" },
  { href: "/backoffice/config/monedas", label: "Monedas", icon: Landmark, section: "Configuración" },
];

const ADVERTISER_NAV: RoleNavItem[] = [
  { href: "/inicio", label: "Inicio", icon: Home, exact: true },
  { href: "/advertiser/planificar", label: "Planificador IA", icon: Sparkles, badge: "IA" },
  { href: "/advertiser/creativo", label: "Validar creativo", icon: ImagePlus, badge: "IA" },
  { href: "/advertiser", label: "Mis solicitudes", icon: Inbox, exact: true },
  { href: "/advertiser/campanas", label: "Campañas", icon: Megaphone },
  { href: "/advertiser/creativos", label: "Creativos", icon: Images },
  { href: "/advertiser/campanas/post-campana", label: "Post-campaña", icon: ClipboardCheck },
  {
    href: "/explorar",
    label: "Catálogo",
    icon: Map,
    match: (p) => p === "/explorar" || p.startsWith("/explorar/"),
  },
];

const PROVIDER_NAV: RoleNavItem[] = [
  { href: "/provider", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/provider/inventario", label: "Mis espacios", icon: Monitor },
  { href: "/provider/cms", label: "CMS / Pantallas", icon: Tv },
  { href: "/provider/reservas", label: "Solicitudes", icon: Inbox },
  { href: "/provider/analytics", label: "Analytics", icon: BarChart3 },
];

const AGENCY_NAV: RoleNavItem[] = [
  { href: "/agency", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/agency/clientes", label: "Clientes", icon: Users },
  { href: "/agency/comparar", label: "Comparar espacios", icon: Columns2 },
  {
    href: "/explorar",
    label: "Explorar catálogo",
    icon: Map,
    match: (p) => p === "/explorar" || p.startsWith("/explorar/"),
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell
      footer={
        <div className="space-y-1">
          <Link className="nm-caption block px-2 py-1 hover:text-foreground" href="/backoffice">
            Ir a Administración →
          </Link>
          <Link className="nm-caption block px-2 py-1 hover:text-foreground" href="/explorar">
            Ver catálogo →
          </Link>
        </div>
      }
      nav={OPS_NAV}
      title="Operaciones"
    >
      {children}
    </RoleShell>
  );
}

export function BackofficeShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell
      footer={
        <Link className="nm-caption block px-2 py-1 hover:text-foreground" href="/admin">
          Ir a Operaciones →
        </Link>
      }
      nav={BACKOFFICE_NAV}
      title="Administración"
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
