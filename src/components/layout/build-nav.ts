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
      desktop: [catalog, ...authLinks],
      mobilePrimary: [catalog, ...authLinks],
    };
  }

  const role = session.user.role;

  if (role === "admin") {
    const ops: NavItem = { href: "/admin", label: "Operaciones" };
    const backoffice: NavItem = { href: "/backoffice", label: "Administración" };
    return {
      desktop: [catalog, ops, backoffice],
      mobilePrimary: [catalog, ops, backoffice],
      mobileSections: [
        {
          title: "Operaciones",
          items: [
            { href: "/admin", label: "Métricas" },
            { href: "/admin/reservas", label: "Reservas" },
            { href: "/admin/operaciones/inventory", label: "Inventario" },
            { href: "/admin/presentaciones", label: "Presentaciones" },
            { href: "/admin/usuarios", label: "Usuarios" },
          ],
        },
        {
          title: "Administración",
          items: [
            { href: "/backoffice", label: "Inicio" },
            { href: "/backoffice/gestion", label: "Gestión" },
            { href: "/backoffice/ordenes/venta", label: "O.P. Venta" },
            { href: "/backoffice/informe", label: "Informe mensual" },
            { href: "/backoffice/clientes", label: "Clientes" },
          ],
        },
      ],
    };
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
