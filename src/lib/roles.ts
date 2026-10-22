/** Operaciones: inventario, reservas, circuitos y presentaciones. El admin también entra. */
export function isPlanningRole(role?: string | null) {
  return role === "admin" || role === "planning";
}

/** Backoffice: órdenes, facturación, cheques e informe. El admin también entra. */
export function isAdministrationRole(role?: string | null) {
  return role === "admin" || role === "administration";
}

export function isAdminRole(role?: string | null) {
  return role === "admin";
}

export function homePathForRole(role?: string | null) {
  if (role === "administration") return "/backoffice";
  if (isPlanningRole(role)) return "/admin";
  if (role === "advertiser") return "/advertiser";
  if (role === "provider") return "/provider";
  if (role === "agency") return "/agency";
  return "/explorar";
}

export const ROLE_LABELS: Record<string, string> = {
  advertiser: "Anunciante",
  provider: "Medio",
  admin: "Admin",
  agency: "Agencia",
  planning: "Planificación",
  administration: "Administración",
  staff: "Equipo",
};
