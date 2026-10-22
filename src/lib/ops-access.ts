import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdministrationRole, isPlanningRole } from "@/lib/roles";

export class OpsAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpsAccessError";
  }
}

async function requireRole(allow: (role?: string | null) => boolean) {
  const session = await auth();
  if (!session?.user?.id || !allow(session.user.role)) {
    throw new OpsAccessError("Acceso denegado.");
  }
  return session;
}

/** Inventario, reservas y presentaciones. */
export function requirePlanningSession() {
  return requireRole(isPlanningRole);
}

/** Órdenes, facturación y maestros del backoffice. */
export function requireAdministrationSession() {
  return requireRole(isAdministrationRole);
}

export async function resolveProviderIdFromForm(formData: FormData): Promise<string> {
  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!providerId) {
    throw new OpsAccessError("Seleccioná un proveedor interno.");
  }
  const exists = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    select: { id: true },
  });
  if (!exists) {
    throw new OpsAccessError("Proveedor interno no encontrado.");
  }
  return providerId;
}

export async function assertUnitBelongsToProvider(unitId: string, providerId: string) {
  const unit = await prisma.inventoryUnit.findFirst({
    where: { id: unitId, providerId },
    select: { id: true },
  });
  if (!unit) {
    throw new OpsAccessError("No encontramos esa unidad o no pertenece al proveedor seleccionado.");
  }
}

export async function listInternalProviders() {
  return prisma.providerProfile.findMany({
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });
}
