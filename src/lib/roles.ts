/** Equipo interno: ve Operaciones y Administración. El admin, además, administra usuarios. */
export function isInternalRole(role?: string | null) {
  return role === "admin" || role === "staff";
}

export function isAdminRole(role?: string | null) {
  return role === "admin";
}

export const ROLE_LABELS: Record<string, string> = {
  advertiser: "Anunciante",
  provider: "Medio",
  admin: "Admin",
  agency: "Agencia",
  staff: "Equipo",
};
