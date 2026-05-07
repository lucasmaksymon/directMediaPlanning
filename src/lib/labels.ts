/** Textos de interfaz para estados persistidos (presentación consistente). */

export const inventoryStatusLabel: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  paused: "Pausado",
};

export const reservationStatusLabel: Record<string, string> = {
  pending_provider: "Pendiente de respuesta",
  rejected: "Rechazada",
  accepted: "Aceptada",
  payment_pending: "Pago en coordinación",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  draft: "Borrador",
};
