import { isAdministrationRole, isAdminRole, isPlanningRole } from "@/lib/roles";
export type NavItem = { href: string; label: string };

type AuthLike = {
  user?: { role?: string; email?: string | null } | null;
} | null;

export function buildHeaderNav(session: AuthLike): {
  desktop: NavItem[];
  mobilePrimary: NavItem[];
  mobileSections?: { title: string; items: NavItem[] }[];
} {
  const catalog: NavItem = { href: "/explorar", label: "Catálogo" };

  if (!session?.user) {
    const authLinks: NavItem[] = [
      { href: "/login", label: "Iniciar sesión" },
      { href: "/register", label: "Crear cuenta" },
    ];
    return {
      desktop: authLinks,
      mobilePrimary: authLinks,
    };
  }

  const role = session.user.role;

  if (isPlanningRole(role) || isAdministrationRole(role)) {
    const ops: NavItem = { href: "/admin", label: "Operaciones" };
    const backoffice: NavItem = { href: "/backoffice", label: "Administración" };
    const opsItems: NavItem[] = [
      { href: "/admin", label: "Métricas" },
      { href: "/admin/reservas", label: "Reservas" },
      { href: "/admin/operaciones/inventory", label: "Inventario" },
      { href: "/admin/presentaciones", label: "Presentaciones" },
      ...(isAdminRole(role) ? [{ href: "/admin/usuarios", label: "Usuarios" }] : []),
    ];
    const backofficeItems: NavItem[] = [
      { href: "/backoffice", label: "Inicio" },
      { href: "/backoffice/gestion", label: "Gestión" },
      { href: "/backoffice/ordenes/venta", label: "O.P. Venta" },
      { href: "/backoffice/informe", label: "Informe mensual" },
      { href: "/backoffice/clientes", label: "Clientes" },
    ];
    const desktop = [catalog, ...(isPlanningRole(role) ? [ops] : []), ...(isAdministrationRole(role) ? [backoffice] : [])];
    const mobileSections = [
      ...(isPlanningRole(role) ? [{ title: "Operaciones", items: opsItems }] : []),
      ...(isAdministrationRole(role) ? [{ title: "Administración", items: backofficeItems }] : []),
    ];
    return { desktop, mobilePrimary: desktop, mobileSections };
  }

  if (role === "advertiser") {
    const dashboard: NavItem = { href: "/advertiser", label: "Mi cuenta" };
    return {
      desktop: [catalog, dashboard],
      mobilePrimary: [catalog, dashboard],
      mobileSections: [
        {
          title: "Cuenta",
          items: [
            { href: "/advertiser", label: "Mis solicitudes" },
            { href: "/advertiser/planificar", label: "Planificador IA" },
            { href: "/advertiser/creativo", label: "Validar creativo" },
          ],
        },
      ],
    };
  }

  return {
    desktop: [catalog],
    mobilePrimary: [catalog],
  };
}
