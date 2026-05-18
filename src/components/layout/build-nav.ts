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
    const adminLink: NavItem = { href: "/admin", label: "Admin" };
    const sectionAdmin: NavItem[] = [
      { href: "/admin", label: "Métricas" },
      { href: "/admin/usuarios", label: "Usuarios" },
      { href: "/admin/reservas", label: "Reservas" },
      { href: "/admin/inventario", label: "Inventario" },
    ];
    return {
      desktop: [catalog, adminLink],
      mobilePrimary: [catalog, adminLink],
      mobileSections: [{ title: "Administración", items: sectionAdmin }],
    };
  }

  if (role === "provider") {
    const dashboard: NavItem = { href: "/provider", label: "Medio" };
    const sectionMedio: NavItem[] = [
      { href: "/provider", label: "Resumen" },
      { href: "/provider/inventory", label: "Inventario" },
      { href: "/provider/inventory/new", label: "Nueva unidad" },
      { href: "/provider/reservations", label: "Solicitudes" },
      { href: "/provider/analytics", label: "Analíticas" },
      { href: "/provider/circuitos", label: "Circuitos OOH" },
    ];
    return {
      desktop: [catalog, dashboard],
      mobilePrimary: [catalog, dashboard],
      mobileSections: [{ title: "Tu medio", items: sectionMedio }],
    };
  }

  if (role === "advertiser") {
    const dashboard: NavItem = { href: "/advertiser", label: "Anunciante" };
    return {
      desktop: [catalog, dashboard],
      mobilePrimary: [catalog, dashboard],
      mobileSections: [
        {
          title: "Cuenta", items: [
            { href: "/advertiser", label: "Mis solicitudes" },
            { href: "/advertiser/planificar", label: "Planificador IA" },
            { href: "/advertiser/creativo", label: "Validar creativo" },
          ]
        }
      ],
    };
  }

  if (role === "agency") {
    const dashboard: NavItem = { href: "/agency", label: "Agencia" };
    return {
      desktop: [catalog, dashboard],
      mobilePrimary: [catalog, dashboard],
      mobileSections: [{ title: "Agencia", items: [{ href: "/agency", label: "Panel agencia" }] }],
    };
  }

  return {
    desktop: [catalog],
    mobilePrimary: [catalog],
  };
}
