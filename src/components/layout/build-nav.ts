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
    const adminLink: NavItem = { href: "/admin", label: "Operaciones" };
    const sectionAdmin: NavItem[] = [
      { href: "/admin/reservas", label: "Reservas" },
      { href: "/admin/operaciones/inventory", label: "Inventario" },
      { href: "/admin/operaciones/inventory/new", label: "Nueva unidad" },
      { href: "/admin/operaciones/circuitos", label: "Circuitos" },
      { href: "/admin/proveedores", label: "Proveedores" },
      { href: "/admin/operaciones", label: "Resumen ops" },
      { href: "/admin", label: "Métricas" },
      { href: "/admin/usuarios", label: "Usuarios" },
    ];
    return {
      desktop: [catalog, adminLink],
      mobilePrimary: [catalog, adminLink],
      mobileSections: [{ title: "NextMedia · Operaciones", items: sectionAdmin }],
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
