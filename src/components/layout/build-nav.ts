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

  if (role === "provider" || role === "admin") {
    const dashboard: NavItem = { href: "/provider", label: "Medio" };
    const sectionMedio: NavItem[] = [
      { href: "/provider", label: "Resumen" },
      { href: "/provider/inventory", label: "Inventario" },
      { href: "/provider/inventory/new", label: "Nueva unidad" },
      { href: "/provider/reservations", label: "Solicitudes" },
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
      mobileSections: [{ title: "Cuenta", items: [{ href: "/advertiser", label: "Mis solicitudes" }] }],
    };
  }

  return {
    desktop: [catalog],
    mobilePrimary: [catalog],
  };
}
